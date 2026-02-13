import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Conversation } from './entity/conversation.entity';
import { ConversationParticipant } from './entity/conversation-participant.entity';
import { ConversationType } from './entity/conversation.entity';
import { FriendRequest } from '../request/entity/friendrequest.entity';
import { User } from '../user/entity/user.entity';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private participantRepo: Repository<ConversationParticipant>,
    @InjectRepository(FriendRequest)
    private friendRequestRepo: Repository<FriendRequest>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /** Ensure two users are friends (for DM) */
  private async areFriends(userId1: number, userId2: number): Promise<boolean> {
    const fr = await this.friendRequestRepo.findOne({
      where: [
        { senderId: userId1, receiverId: userId2, status: 'ACCEPTED' },
        { senderId: userId2, receiverId: userId1, status: 'ACCEPTED' },
      ],
    });
    return !!fr;
  }

  /** Create DM between current user and one friend; or create GROUP with multiple participants */
  async createConversation(
    userId: number,
    options: {
      type: ConversationType;
      participantIds: number[];
      name?: string;
    },
  ): Promise<Conversation> {
    const { type, participantIds, name } = options;
    const allIds = [userId, ...participantIds].filter(
      (id, i, arr) => arr.indexOf(id) === i,
    );

    if (type === 'DM') {
      if (participantIds.length !== 1) {
        throw new ForbiddenException('DM must have exactly one other participant');
      }
      const otherId = participantIds[0];
      if (userId === otherId) {
        throw new ForbiddenException('Cannot create DM with yourself');
      }
      const friends = await this.areFriends(userId, otherId);
      if (!friends) {
        throw new ForbiddenException('Can only start DM with a friend');
      }
      const existing = await this.getOrFindDm(userId, otherId);
      if (existing) return existing;
    }

    const conversation = this.conversationRepo.create({
      type,
      name: type === 'GROUP' ? name || null : null,
    });
    await this.conversationRepo.save(conversation);

    const participants = allIds.map((uid) =>
      this.participantRepo.create({
        conversationId: conversation.id,
        userId: uid,
        role: 'member',
      }),
    );
    await this.participantRepo.save(participants);
    conversation.participants = participants;
    return conversation;
  }

  /** Get or find existing DM between two users */
  async getOrFindDm(userId1: number, userId2: number): Promise<Conversation | null> {
    const qb = this.conversationRepo
      .createQueryBuilder('c')
      .innerJoin('conversation_participants', 'p1', 'p1."conversationId" = c.id AND p1."userId" = :u1', { u1: userId1 })
      .innerJoin('conversation_participants', 'p2', 'p2."conversationId" = c.id AND p2."userId" = :u2', { u2: userId2 })
      .where('c.type = :type', { type: 'DM' });
    return qb.getOne();
  }

  /** Chat list: conversations for user with last message cache and participant info */
  async getConversationsForUser(userId: number) {
    const convos = await this.conversationRepo
      .createQueryBuilder('c')
      .innerJoin('conversation_participants', 'p', 'p."conversationId" = c.id AND p."userId" = :userId', { userId })
      .orderBy('c."lastMessageAt"', 'DESC', 'NULLS LAST')
      .addOrderBy('c."createdAt"', 'DESC')
      .getMany();

    const withParticipants = await Promise.all(
      convos.map(async (c) => {
        const participants = await this.participantRepo.find({
          where: { conversationId: c.id },
          relations: [],
        });
        const otherUserIds = participants.map((p) => p.userId).filter((id) => id !== userId);
        const users = otherUserIds.length
          ? await this.userRepo.find({
              where: { id: In(otherUserIds) },
              select: ['id', 'name', 'username', 'avatar', 'email'],
            })
          : [];

        // For DMs, check if still friends
        let stillFriends = true;
        if (c.type === 'DM' && otherUserIds.length === 1) {
          stillFriends = await this.areFriends(userId, otherUserIds[0]);
        }

        return {
          id: c.id,
          type: c.type,
          name: c.name,
          lastMessageId: c.lastMessageId,
          lastMessageAt: c.lastMessageAt,
          lastMessagePreview: c.lastMessagePreview,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          participants: users.map((u) => ({
            id: u.id,
            name: u.name,
            username: u.username,
            avatar: u.avatar,
            email: u.email,
          })),
          /** For DM dedup: key = sorted pair of participant ids */
          _dmKey: c.type === 'DM' && otherUserIds.length === 1
            ? [userId, otherUserIds[0]].sort((a, b) => a - b).join('-')
            : null,
          /** Flag to indicate if users are still friends (for frontend to disable input) */
          stillFriends: stillFriends,
        };
      }),
    );

    /** Deduplicate DMs: same two users should appear only once (keep most recent) */
    const seenDmKeys = new Set<string>();
    const deduped = withParticipants.filter((item) => {
      if (item.type !== 'DM' || item._dmKey == null) return true;
      if (seenDmKeys.has(item._dmKey)) return false;
      seenDmKeys.add(item._dmKey);
      return true;
    });
    const cleaned = deduped.map(({ _dmKey, ...rest }) => rest);

    return {
      message: 'Conversations fetched successfully',
      count: cleaned.length,
      conversations: cleaned,
    };
  }

  /** Get one conversation by id; ensure user is participant */
  async getConversationById(conversationId: number, userId: number): Promise<Conversation> {
    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId },
    });
    if (!participant) {
      throw new NotFoundException('Conversation not found or access denied');
    }
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['participants'],
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  /** Check if user is participant */
  async isParticipant(conversationId: number, userId: number): Promise<boolean> {
    const p = await this.participantRepo.findOne({
      where: { conversationId, userId },
    });
    return !!p;
  }

  /** Check if users in a DM are still friends (returns true for GROUP or if still friends) */
  async areDmParticipantsFriends(conversationId: number, userId: number): Promise<boolean> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });
    if (!conversation || conversation.type !== 'DM') {
      return true; // GROUP conversations don't require friendship
    }

    const participants = await this.participantRepo.find({
      where: { conversationId },
    });
    const participantIds = participants.map((p) => p.userId);
    if (participantIds.length !== 2 || !participantIds.includes(userId)) {
      return false;
    }

    const otherId = participantIds.find((id) => id !== userId);
    if (!otherId) return false;

    return this.areFriends(userId, otherId);
  }

  /** Update last message cache on conversation (called by MessageService) */
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

  /** Future: mark conversation as read for user (read receipts) */
  async markAsRead(conversationId: number, userId: number): Promise<void> {
    await this.participantRepo.update(
      { conversationId, userId },
      { lastReadAt: new Date() },
    );
  }
}
