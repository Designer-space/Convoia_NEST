import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FriendRequest,
  FriendRequestStatus,
} from './entity/friendrequest.entity';
import { User } from '../user/entity/user.entity';
import { NotificationService } from '../notification/notification.service';

/** Days a user must wait before re-sending a request after a rejection. */
const REJECTION_COOLDOWN_DAYS = 7;

function orderedPair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

@Injectable()
export class RequestService {
  constructor(
    @InjectRepository(FriendRequest)
    private readonly friendRequestRepository: Repository<FriendRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}

  private async requireUser(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Accepted friendships for a user, one query for pairs + one for users. */
  async getAllFriends(userId: number) {
    const links = await this.friendRequestRepository.find({
      where: [
        { senderId: userId, status: FriendRequestStatus.ACCEPTED },
        { receiverId: userId, status: FriendRequestStatus.ACCEPTED },
      ],
      order: { respondedAt: 'DESC', createdAt: 'DESC' },
    });

    const friendIds = [
      ...new Set(
        links.map((l) => (l.senderId === userId ? l.receiverId : l.senderId)),
      ),
    ];

    const users = friendIds.length
      ? await this.userRepository
          .createQueryBuilder('u')
          .where('u.id IN (:...ids)', { ids: friendIds })
          .getMany()
      : ([] as User[]);
    const byId = new Map(users.map((u) => [u.id, u]));

    const friends = links
      .map((link) => {
        const otherId =
          link.senderId === userId ? link.receiverId : link.senderId;
        const other = byId.get(otherId);
        if (!other) return null;
        const showEmail = other.privacy?.showEmailToFriends ?? true;
        const showPhone = other.privacy?.showPhoneToFriends ?? true;
        return {
          friendshipId: link.id,
          friendsSince: link.respondedAt ?? link.createdAt,
          friend: {
            id: other.id,
            name: other.name,
            username: other.username,
            avatar: other.avatar ?? null,
            gender: other.gender,
            age: other.age,
            email: showEmail ? other.email : null,
            phoneNumber: showPhone ? other.phoneNumber : null,
          },
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    return { count: friends.length, friends };
  }

  async sendFriendRequest(userId: number, receiverId: number) {
    if (userId === receiverId) {
      throw new BadRequestException(
        'You cannot send a friend request to yourself',
      );
    }

    await this.requireUser(receiverId);

    const [userLowId, userHighId] = orderedPair(userId, receiverId);

    const live = await this.friendRequestRepository.findOne({
      where: [
        { userLowId, userHighId, status: FriendRequestStatus.PENDING },
        { userLowId, userHighId, status: FriendRequestStatus.ACCEPTED },
      ],
    });

    if (live) {
      throw new ConflictException(
        live.status === FriendRequestStatus.ACCEPTED
          ? 'You are already friends'
          : 'A friend request is already pending between you',
      );
    }

    const lastRejected = await this.friendRequestRepository.findOne({
      where: [
        { userLowId, userHighId, status: FriendRequestStatus.REJECTED },
        { userLowId, userHighId, status: FriendRequestStatus.CANCELLED },
      ],
      order: { respondedAt: 'DESC', createdAt: 'DESC' },
    });

    if (lastRejected) {
      const since = lastRejected.respondedAt ?? lastRejected.createdAt;
      const cooldownEnds = new Date(
        since.getTime() + REJECTION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
      );
      if (cooldownEnds.getTime() > Date.now()) {
        throw new ConflictException(
          `You can send another request after ${cooldownEnds.toISOString()}`,
        );
      }
    }

    const request = this.friendRequestRepository.create({
      senderId: userId,
      receiverId,
      userLowId,
      userHighId,
      status: FriendRequestStatus.PENDING,
    });

    try {
      await this.friendRequestRepository.save(request);
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException('A friend request is already pending');
      }
      throw err;
    }

    const sender = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'name', 'avatar'],
    });
    await this.notificationService.notify(receiverId, 'FRIEND_REQUEST_SENT', {
      senderId: sender?.id,
      senderName: sender?.name,
      senderAvatar: sender?.avatar,
    });

    return { request };
  }

  async getAllFriendRequests(userId: number) {
    const requests = await this.friendRequestRepository
      .createQueryBuilder('fr')
      .innerJoin('users', 'u', 'u.id = fr."senderId"')
      .where('fr."receiverId" = :userId', { userId })
      .andWhere('fr.status = :status', { status: FriendRequestStatus.PENDING })
      .orderBy('fr."createdAt"', 'DESC')
      .select([
        'fr.id AS "requestId"',
        'fr.status AS "status"',
        'fr."createdAt" AS "createdAt"',
        'u.id AS "sender_id"',
        'u.name AS "sender_name"',
        'u.username AS "sender_username"',
        'u.avatar AS "sender_avatar"',
      ])
      .getRawMany<{
        requestId: number;
        status: FriendRequestStatus;
        createdAt: Date;
        sender_id: number;
        sender_name: string;
        sender_username: string | null;
        sender_avatar: string | null;
      }>();

    return {
      requests: requests.map((r) => ({
        id: r.requestId,
        status: r.status,
        createdAt: r.createdAt,
        sender: {
          id: r.sender_id,
          name: r.sender_name,
          username: r.sender_username,
          avatar: r.sender_avatar,
        },
      })),
    };
  }

  async getAllSentRequests(userId: number) {
    const requests = await this.friendRequestRepository
      .createQueryBuilder('fr')
      .innerJoin('users', 'u', 'u.id = fr."receiverId"')
      .where('fr."senderId" = :userId', { userId })
      .andWhere('fr.status = :status', { status: FriendRequestStatus.PENDING })
      .orderBy('fr."createdAt"', 'DESC')
      .select([
        'fr.id AS "requestId"',
        'fr.status AS "status"',
        'fr."createdAt" AS "createdAt"',
        'u.id AS "receiver_id"',
        'u.name AS "receiver_name"',
        'u.username AS "receiver_username"',
        'u.avatar AS "receiver_avatar"',
      ])
      .getRawMany<{
        requestId: number;
        status: FriendRequestStatus;
        createdAt: Date;
        receiver_id: number;
        receiver_name: string;
        receiver_username: string | null;
        receiver_avatar: string | null;
      }>();

    return {
      requests: requests.map((r) => ({
        id: r.requestId,
        status: r.status,
        createdAt: r.createdAt,
        receiver: {
          id: r.receiver_id,
          name: r.receiver_name,
          username: r.receiver_username,
          avatar: r.receiver_avatar,
        },
      })),
    };
  }

  private async loadPendingRequest(requestId: number): Promise<FriendRequest> {
    const request = await this.friendRequestRepository.findOne({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Friend request not found');
    return request;
  }

  async acceptFriendRequest(userId: number, requestId: number) {
    const request = await this.loadPendingRequest(requestId);

    if (request.receiverId !== userId) {
      throw new ForbiddenException('You cannot respond to this request');
    }
    if (request.status !== FriendRequestStatus.PENDING) {
      throw new ConflictException(
        `Friend request is already ${request.status.toLowerCase()}`,
      );
    }

    request.status = FriendRequestStatus.ACCEPTED;
    request.respondedAt = new Date();
    await this.friendRequestRepository.save(request);

    const receiver = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'name'],
    });
    await this.notificationService.notify(
      request.senderId,
      'FRIEND_REQUEST_ACCEPTED',
      { receiverId: receiver?.id, receiverName: receiver?.name },
    );

    return { request };
  }

  async rejectFriendRequest(userId: number, requestId: number) {
    const request = await this.loadPendingRequest(requestId);

    if (request.receiverId !== userId) {
      throw new ForbiddenException('You cannot respond to this request');
    }
    if (request.status !== FriendRequestStatus.PENDING) {
      throw new ConflictException(
        `Friend request is already ${request.status.toLowerCase()}`,
      );
    }

    request.status = FriendRequestStatus.REJECTED;
    request.respondedAt = new Date();
    await this.friendRequestRepository.save(request);

    const receiver = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'name'],
    });
    await this.notificationService.notify(
      request.senderId,
      'FRIEND_REQUEST_REJECTED',
      { receiverId: receiver?.id, receiverName: receiver?.name },
    );

    return { request };
  }

  /** Sender withdraws their own pending request. */
  async cancelFriendRequest(userId: number, requestId: number) {
    const request = await this.loadPendingRequest(requestId);

    if (request.senderId !== userId) {
      throw new ForbiddenException('You can only cancel requests you sent');
    }
    if (request.status !== FriendRequestStatus.PENDING) {
      throw new ConflictException(
        `Friend request is already ${request.status.toLowerCase()}`,
      );
    }

    request.status = FriendRequestStatus.CANCELLED;
    request.respondedAt = new Date();
    await this.friendRequestRepository.save(request);
    return { success: true };
  }

  /** Strangers the user can still reach out to. Never exposes email/phone. */
  async getAllNonAcceptedUser(userId: number) {
    const related = await this.friendRequestRepository.find({
      where: [
        { senderId: userId, status: FriendRequestStatus.PENDING },
        { receiverId: userId, status: FriendRequestStatus.PENDING },
        { senderId: userId, status: FriendRequestStatus.ACCEPTED },
        { receiverId: userId, status: FriendRequestStatus.ACCEPTED },
      ],
      select: ['senderId', 'receiverId'],
    });

    const excludedIds = new Set<number>();
    for (const r of related) {
      excludedIds.add(r.senderId === userId ? r.receiverId : r.senderId);
    }
    excludedIds.add(userId);

    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id NOT IN (:...ids)', { ids: [...excludedIds] })
      .select([
        'user.id',
        'user.name',
        'user.username',
        'user.avatar',
        'user.gender',
        'user.age',
      ])
      .orderBy('user.name', 'ASC')
      .limit(100)
      .getMany();

    return { users };
  }

  async unfriend(userId: number, friendId: number) {
    if (userId === friendId) {
      throw new BadRequestException('You cannot unfriend yourself');
    }
    const [userLowId, userHighId] = orderedPair(userId, friendId);
    const result = await this.friendRequestRepository.delete({
      userLowId,
      userHighId,
      status: FriendRequestStatus.ACCEPTED,
    });
    if (result.affected === 0) {
      throw new NotFoundException('You are not friends with this user');
    }
    return { success: true };
  }
}
