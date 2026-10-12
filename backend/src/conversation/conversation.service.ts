import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Conversation, ConversationType } from './entity/conversation.entity';
import { ConversationParticipant } from './entity/conversation-participant.entity';
import {
  FriendRequest,
  FriendRequestStatus,
} from '../request/entity/friendrequest.entity';
import { User } from '../user/entity/user.entity';

export const MAX_GROUP_MEMBERS = 256;

function dmKeyFor(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private readonly participantRepo: Repository<ConversationParticipant>,
    @InjectRepository(FriendRequest)
    private readonly friendRequestRepo: Repository<FriendRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private async acceptedFriendIds(userId: number): Promise<Set<number>> {
    const links = await this.friendRequestRepo.find({
      where: [
        { senderId: userId, status: FriendRequestStatus.ACCEPTED },
        { receiverId: userId, status: FriendRequestStatus.ACCEPTED },
      ],
      select: ['senderId', 'receiverId'],
    });
    return new Set(
      links.map((l) => (l.senderId === userId ? l.receiverId : l.senderId)),
    );
  }

  private async areFriends(userId1: number, userId2: number): Promise<boolean> {
    const [userLowId, userHighId] =
      userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
    const link = await this.friendRequestRepo.findOne({
      where: { userLowId, userHighId, status: FriendRequestStatus.ACCEPTED },
    });
    return !!link;
  }

  async createConversation(
    userId: number,
    options: {
      type: ConversationType;
      participantIds: number[];
      name?: string;
    },
  ): Promise<Conversation> {
    const { type, participantIds, name } = options;

    if (type === ConversationType.DM) {
      if (participantIds.length !== 1) {
        throw new BadRequestException(
          'A DM must have exactly one other participant',
        );
      }
      const otherId = participantIds[0];
      if (otherId === userId) {
        throw new BadRequestException('Cannot create a DM with yourself');
      }
      if (!(await this.areFriends(userId, otherId))) {
        throw new ForbiddenException('You can only DM friends');
      }
      return this.getOrCreateDm(userId, otherId);
    }

    const memberIds = [...new Set(participantIds)].filter(
      (id) => id !== userId,
    );
    if (memberIds.length === 0) {
      throw new BadRequestException('A group needs at least one other member');
    }
    if (memberIds.length + 1 > MAX_GROUP_MEMBERS) {
      throw new BadRequestException(
        `Groups are limited to ${MAX_GROUP_MEMBERS} members`,
      );
    }

    const existingMembers = await this.userRepo.find({
      where: { id: In(memberIds) },
      select: ['id'],
    });
    const existingIds = new Set(existingMembers.map((u) => u.id));
    const missing = memberIds.filter((id) => !existingIds.has(id));
    if (missing.length) {
      throw new NotFoundException(`Unknown user(s): ${missing.join(', ')}`);
    }

    const friendIds = await this.acceptedFriendIds(userId);
    const notFriends = memberIds.filter((id) => !friendIds.has(id));
    if (notFriends.length) {
      throw new ForbiddenException('You can only add friends to a group');
    }

    const conversation = await this.conversationRepo.save(
      this.conversationRepo.create({
        type: ConversationType.GROUP,
        name: name ?? null,
        dmKey: null,
      }),
    );

    const participants = [userId, ...memberIds].map((uid) =>
      this.participantRepo.create({
        conversationId: conversation.id,
        userId: uid,
        role: uid === userId ? 'owner' : 'member',
      }),
    );
    await this.participantRepo.save(participants);
    return conversation;
  }

  /** Idempotent DM creation backed by the unique `dmKey` column. */
  private async getOrCreateDm(
    userId1: number,
    userId2: number,
  ): Promise<Conversation> {
    const dmKey = dmKeyFor(userId1, userId2);

    const existing = await this.conversationRepo.findOne({ where: { dmKey } });
    if (existing) return existing;

    try {
      const created = await this.conversationRepo.save(
        this.conversationRepo.create({
          type: ConversationType.DM,
          dmKey,
          name: null,
        }),
      );
      await this.participantRepo.save([
        this.participantRepo.create({
          conversationId: created.id,
          userId: userId1,
          role: 'member',
        }),
        this.participantRepo.create({
          conversationId: created.id,
          userId: userId2,
          role: 'member',
        }),
      ]);
      return created;
    } catch (err) {
      // Concurrent create: another request won the unique index race.
      if ((err as { code?: string }).code === '23505') {
        const winner = await this.conversationRepo.findOne({
          where: { dmKey },
        });
        if (winner) return winner;
      }
      throw err;
    }
  }

  /** Allocation of the next per-conversation sequence number. */
  async nextSeq(conversationId: number): Promise<number> {
    const result = await this.conversationRepo
      .createQueryBuilder()
      .update(Conversation)
      .set({ lastSeq: () => '"lastSeq" + 1' })
      .where('id = :id', { id: conversationId })
      .returning('"lastSeq"')
      .execute();
    const raw = (result.raw as Array<{ lastSeq: string }> | undefined)?.[0]
      ?.lastSeq;
    if (raw == null) throw new NotFoundException('Conversation not found');
    return Number(raw);
  }

  /** Fixed-query conversation list with unread counts (no N+1). */
  async getConversationsForUser(userId: number) {
    const mine = await this.participantRepo.find({
      where: { userId },
      select: ['conversationId', 'lastReadSeq'],
    });
    if (mine.length === 0) {
      return { count: 0, conversations: [] };
    }

    const readByConversation = new Map(
      mine.map((p) => [p.conversationId, Number(p.lastReadSeq)]),
    );
    const conversationIds = mine.map((p) => p.conversationId);

    const conversations = await this.conversationRepo.find({
      where: { id: In(conversationIds) },
      order: { lastMessageAt: 'DESC', createdAt: 'DESC' },
    });

    const participants = await this.participantRepo.find({
      where: { conversationId: In(conversationIds) },
    });

    const otherUserIds = [
      ...new Set(
        participants.map((p) => p.userId).filter((id) => id !== userId),
      ),
    ];
    const users = otherUserIds.length
      ? await this.userRepo.find({
          where: { id: In(otherUserIds) },
          select: ['id', 'name', 'username', 'avatar'],
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    const participantsByConversation = new Map<number, number[]>();
    for (const p of participants) {
      const list = participantsByConversation.get(p.conversationId) ?? [];
      list.push(p.userId);
      participantsByConversation.set(p.conversationId, list);
    }

    const friendIds = await this.acceptedFriendIds(userId);

    const list = conversations.map((c) => {
      const allIds = participantsByConversation.get(c.id) ?? [];
      const others = allIds.filter((id) => id !== userId);
      const unread = Math.max(
        0,
        Number(c.lastSeq) - (readByConversation.get(c.id) ?? 0),
      );
      const stillFriends =
        c.type === ConversationType.DM && others.length === 1
          ? friendIds.has(others[0])
          : true;

      return {
        id: c.id,
        type: c.type,
        name: c.name,
        lastMessageId: c.lastMessageId,
        lastMessageAt: c.lastMessageAt,
        lastMessagePreview: c.lastMessagePreview,
        lastSeq: Number(c.lastSeq),
        unreadCount: unread,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        stillFriends,
        // Email is deliberately omitted from participant summaries.
        participants: others
          .map((id) => userById.get(id))
          .filter((u): u is User => !!u)
          .map((u) => ({
            id: u.id,
            name: u.name,
            username: u.username,
            avatar: u.avatar,
          })),
      };
    });

    return { count: list.length, conversations: list };
  }

  async getConversationById(
    conversationId: number,
    userId: number,
  ): Promise<Conversation> {
    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId },
    });
    if (!participant) {
      throw new NotFoundException('Conversation not found or access denied');
    }
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async isParticipant(
    conversationId: number,
    userId: number,
  ): Promise<boolean> {
    const p = await this.participantRepo.findOne({
      where: { conversationId, userId },
    });
    return !!p;
  }

  /** Conversation ids a user belongs to (used to auto-join socket rooms). */
  async getConversationIdsForUser(userId: number): Promise<number[]> {
    const rows = await this.participantRepo.find({
      where: { userId },
      select: ['conversationId'],
    });
    return rows.map((r) => r.conversationId);
  }

  async areDmParticipantsFriends(
    conversationId: number,
    userId: number,
  ): Promise<boolean> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });
    if (!conversation || conversation.type !== ConversationType.DM) return true;

    const participants = await this.participantRepo.find({
      where: { conversationId },
      select: ['userId'],
    });
    const ids = participants.map((p) => p.userId);
    if (ids.length !== 2 || !ids.includes(userId)) return false;
    const otherId = ids.find((id) => id !== userId);
    if (!otherId) return false;
    return this.areFriends(userId, otherId);
  }

  async updateLastMessageCache(
    conversationId: number,
    payload: {
      lastMessageId: string;
      lastMessageAt: Date;
      lastMessagePreview: string;
    },
  ): Promise<void> {
    await this.conversationRepo.update(conversationId, payload);
  }

  async getLastReadSeq(
    conversationId: number,
    userId: number,
  ): Promise<number> {
    const p = await this.participantRepo.findOne({
      where: { conversationId, userId },
      select: ['lastReadSeq'],
    });
    return p ? Number(p.lastReadSeq) : 0;
  }

  async markAsRead(
    conversationId: number,
    userId: number,
    lastReadSeq: number,
  ): Promise<void> {
    await this.participantRepo
      .createQueryBuilder()
      .update(ConversationParticipant)
      .set({ lastReadSeq: String(lastReadSeq), lastReadAt: new Date() })
      .where('"conversationId" = :conversationId AND "userId" = :userId', {
        conversationId,
        userId,
      })
      .andWhere('"lastReadSeq" < :lastReadSeq', { lastReadSeq })
      .execute();
  }
}
