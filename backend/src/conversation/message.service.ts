import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageType } from './schema/message.schema';
import { ConversationService } from './conversation.service';
import { ChatGateway } from './chat.gateway';

const PREVIEW_MAX_LEN = 100;

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private conversationService: ConversationService,
    private chatGateway: ChatGateway,
  ) {}

  /** Send a text message (and optionally future: type + attachments) */
  async sendMessage(
    conversationId: number,
    senderId: number,
    payload: {
      content: string | null;
      type?: MessageType;
      attachments?: { type: MessageType; url: string; filename?: string; mimeType?: string; size?: number }[];
      replyToMessageId?: string | null;
    },
  ) {
    const canSend = await this.conversationService.isParticipant(conversationId, senderId);
    if (!canSend) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    // For DMs, ensure users are still friends
    const stillFriends = await this.conversationService.areDmParticipantsFriends(conversationId, senderId);
    if (!stillFriends) {
      throw new ForbiddenException('Cannot send messages to unfriended users');
    }

    const type = payload.type ?? 'TEXT';
    if (type === 'TEXT' && (payload.content == null || String(payload.content).trim() === '')) {
      throw new BadRequestException('Text message must have content');
    }
    const doc = await this.messageModel.create({
      conversationId,
      senderId,
      type,
      content: payload.content ?? null,
      attachments: payload.attachments ?? [],
      replyToMessageId: payload.replyToMessageId ?? null,
    });
    const saved = await doc.save();

    const preview = this.buildPreview(type, payload.content, payload.attachments);
    await this.conversationService.updateLastMessageCache(conversationId, {
      lastMessageId: String(saved._id),
      lastMessageAt: saved.createdAt,
      lastMessagePreview: preview,
    });

    const response = {
      id: String(saved._id),
      conversationId: saved.conversationId,
      senderId: saved.senderId,
      type: saved.type,
      content: saved.content,
      attachments: saved.attachments,
      readBy: saved.readBy,
      replyToMessageId: saved.replyToMessageId,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
    this.chatGateway.emitNewMessage(conversationId, response);
    return response;
  }

  private buildPreview(
    type: MessageType,
    content: string | null,
    attachments?: { type: string }[],
  ): string {
    if (type !== 'TEXT' && attachments?.length) {
      const first = attachments[0];
      const label = first.type === 'IMAGE' ? 'Photo' : first.type === 'FILE' ? 'File' : first.type;
      return `[${label}]`;
    }
    if (content && content.trim()) {
      return content.length > PREVIEW_MAX_LEN
        ? content.slice(0, PREVIEW_MAX_LEN) + '…'
        : content;
    }
    return '[Message]';
  }

  /** Get messages for a conversation (paginated, newest first) */
  async getMessages(
    conversationId: number,
    userId: number,
    limit: number = 50,
    before?: string,
  ) {
    const canRead = await this.conversationService.isParticipant(conversationId, userId);
    if (!canRead) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    const filter: any = { conversationId, deleted: { $ne: true } };
    if (before) {
      const beforeDate = await this.messageModel
        .findById(before)
        .select('createdAt')
        .lean();
      if (beforeDate?.createdAt) {
        filter.createdAt = { $lt: beforeDate.createdAt };
      }
    }

    const messages = await this.messageModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const list = messages.map((m) => ({
      id: String(m._id),
      conversationId: m.conversationId,
      senderId: m.senderId,
      type: m.type,
      content: m.content,
      attachments: m.attachments,
      readBy: m.readBy,
      replyToMessageId: m.replyToMessageId,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    return {
      message: 'Messages fetched successfully',
      conversationId,
      count: list.length,
      messages: list,
    };
  }

  /** Future: mark message(s) as read for a user (read receipts) */
  async markAsRead(
    conversationId: number,
    userId: number,
    messageIds?: string[],
  ): Promise<void> {
    const canRead = await this.conversationService.isParticipant(conversationId, userId);
    if (!canRead) return;

    const readAt = new Date();
    if (messageIds?.length) {
      await this.messageModel.updateMany(
        { _id: { $in: messageIds }, conversationId },
        { $addToSet: { readBy: { userId, readAt } } },
      );
    }
    await this.conversationService.markAsRead(conversationId, userId);
  }
}
