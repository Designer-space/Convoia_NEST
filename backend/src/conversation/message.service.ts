import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageType } from './schema/message.schema';
import { ConversationService } from './conversation.service';
import { ChatGateway } from './chat.gateway';

const PREVIEW_MAX_LEN = 100;
const MAX_LIMIT = 100;

function isValidObjectId(value: unknown): value is string {
  return typeof value === 'string' && Types.ObjectId.isValid(value);
}

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    private readonly conversationService: ConversationService,
    private readonly chatGateway: ChatGateway,
  ) {}

  private toDto(m: Message & { _id: Types.ObjectId }) {
    return {
      id: String(m._id),
      conversationId: m.conversationId,
      senderId: m.senderId,
      seq: m.seq,
      clientMsgId: m.clientMsgId,
      type: m.type,
      content: m.content,
      attachments: m.attachments,
      replyToMessageId: m.replyToMessageId,
      deleted: m.deleted,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }

  async sendMessage(
    conversationId: number,
    senderId: number,
    payload: {
      content: string | null;
      type?: MessageType;
      clientMsgId?: string | null;
      attachments?: {
        type: MessageType;
        url: string;
        filename?: string;
        mimeType?: string;
        size?: number;
      }[];
      replyToMessageId?: string | null;
    },
  ) {
    if (
      !(await this.conversationService.isParticipant(conversationId, senderId))
    ) {
      throw new ForbiddenException(
        'You are not a participant of this conversation',
      );
    }
    if (
      !(await this.conversationService.areDmParticipantsFriends(
        conversationId,
        senderId,
      ))
    ) {
      throw new ForbiddenException('Cannot send messages to unfriended users');
    }

    const type = payload.type ?? 'TEXT';
    if (
      type === 'TEXT' &&
      (payload.content == null || String(payload.content).trim() === '')
    ) {
      throw new BadRequestException('Text message must have content');
    }

    // Reply target must be a real message in this same conversation.
    let replyToMessageId: string | null = null;
    if (payload.replyToMessageId) {
      if (!isValidObjectId(payload.replyToMessageId)) {
        throw new BadRequestException('Invalid replyToMessageId');
      }
      const target = await this.messageModel
        .findOne({ _id: payload.replyToMessageId, conversationId })
        .select('_id')
        .lean();
      if (!target) {
        throw new BadRequestException(
          'Reply target is not in this conversation',
        );
      }
      replyToMessageId = payload.replyToMessageId;
    }

    const clientMsgId = payload.clientMsgId ?? null;

    // Idempotency: a retried send with the same clientMsgId returns the original.
    if (clientMsgId) {
      const existing = await this.messageModel.findOne({
        conversationId,
        senderId,
        clientMsgId,
      });
      if (existing) return this.toDto(existing);
    }

    const seq = await this.conversationService.nextSeq(conversationId);

    let saved: Message & { _id: Types.ObjectId };
    try {
      saved = await this.messageModel.create({
        conversationId,
        senderId,
        seq,
        clientMsgId,
        type,
        content: payload.content ?? null,
        attachments: payload.attachments ?? [],
        replyToMessageId,
      });
    } catch (err) {
      // Concurrent retry inserted first via the unique index.
      if ((err as { code?: number }).code === 11000 && clientMsgId) {
        const existing = await this.messageModel.findOne({
          conversationId,
          senderId,
          clientMsgId,
        });
        if (existing) return this.toDto(existing);
      }
      throw err;
    }

    const preview = this.buildPreview(
      type,
      payload.content,
      payload.attachments,
    );
    await this.conversationService.updateLastMessageCache(conversationId, {
      lastMessageId: String(saved._id),
      lastMessageAt: saved.createdAt,
      lastMessagePreview: preview,
    });

    const dto = this.toDto(saved);
    this.chatGateway.emitNewMessage(conversationId, dto);
    return dto;
  }

  private buildPreview(
    type: MessageType,
    content: string | null,
    attachments?: { type: string }[],
  ): string {
    if (type !== 'TEXT' && attachments?.length) {
      const first = attachments[0];
      const label =
        first.type === 'IMAGE'
          ? 'Photo'
          : first.type === 'FILE'
            ? 'File'
            : first.type;
      return `[${label}]`;
    }
    if (content && content.trim()) {
      return content.length > PREVIEW_MAX_LEN
        ? content.slice(0, PREVIEW_MAX_LEN) + '…'
        : content;
    }
    return '[Message]';
  }

  /**
   * Page through messages using the monotonic `seq`.
   * - `beforeSeq`: older page (newest-first result).
   * - `afterSeq`: catch-up/newer page (oldest-first result).
   */
  async getMessages(
    conversationId: number,
    userId: number,
    limit: number = 50,
    beforeSeq?: string,
    afterSeq?: string,
  ) {
    if (
      !(await this.conversationService.isParticipant(conversationId, userId))
    ) {
      throw new ForbiddenException(
        'You are not a participant of this conversation',
      );
    }

    const take = Math.min(MAX_LIMIT, Math.max(1, limit || 50));
    const filter: Record<string, unknown> = { conversationId };

    const parseSeq = (
      value: string | undefined,
      field: string,
    ): number | undefined => {
      if (value == null || value === '') return undefined;
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0) {
        throw new BadRequestException(`Invalid ${field} cursor`);
      }
      return n;
    };

    const before = parseSeq(beforeSeq, 'before');
    const after = parseSeq(afterSeq, 'after');

    let sort: 1 | -1 = -1;
    if (before !== undefined) {
      filter.seq = { $lt: before };
    } else if (after !== undefined) {
      filter.seq = { $gt: after };
      sort = 1;
    }

    const rows = await this.messageModel
      .find(filter)
      .sort({ seq: sort })
      .limit(take + 1)
      .lean();

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const messages = page.map((m) =>
      this.toDto(m as Message & { _id: Types.ObjectId }),
    );

    const lastReadSeq = await this.conversationService.getLastReadSeq(
      conversationId,
      userId,
    );

    return {
      conversationId,
      count: messages.length,
      hasMore,
      lastReadSeq,
      messages,
    };
  }

  /** Idempotent, monotonic read state. */
  async markAsRead(
    conversationId: number,
    userId: number,
    lastReadSeq?: number,
  ): Promise<{ lastReadSeq: number }> {
    if (
      !(await this.conversationService.isParticipant(conversationId, userId))
    ) {
      throw new ForbiddenException(
        'You are not a participant of this conversation',
      );
    }

    const conversation = await this.conversationService.getConversationById(
      conversationId,
      userId,
    );
    const conversationLast = Number(conversation.lastSeq);
    const target =
      lastReadSeq == null
        ? conversationLast
        : Math.min(Number(lastReadSeq), conversationLast);

    await this.conversationService.markAsRead(conversationId, userId, target);
    const current = await this.conversationService.getLastReadSeq(
      conversationId,
      userId,
    );
    this.chatGateway.emitReadUpdated(conversationId, userId, current);
    return { lastReadSeq: current };
  }

  /** Used to validate the reply target reference from the REST layer. */
  async assertMessageInConversation(
    messageId: string,
    conversationId: number,
  ): Promise<void> {
    if (!isValidObjectId(messageId)) {
      throw new BadRequestException('Invalid message id');
    }
    const exists = await this.messageModel
      .findOne({ _id: messageId, conversationId })
      .select('_id')
      .lean();
    if (!exists) throw new NotFoundException('Message not found');
  }
}
