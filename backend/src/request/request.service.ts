import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FriendRequest } from './entity/friendrequest.entity.js';
import { User } from '../user/entity/user.entity';
import { Repository, Not, In } from 'typeorm';
import { NotificationService } from '../notification/notification.service.js';

@Injectable()
export class RequestService {
  constructor(
    @InjectRepository(FriendRequest)
    private friendRequestRepository: Repository<FriendRequest>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}

  async getAllFriends(userId: number) {
    // Get all ACCEPTED friend requests where user is either sender or receiver
    const friendRequests = await this.friendRequestRepository
      .createQueryBuilder('fr')
      .innerJoin(
        'users',
        'u',
        'u.id = CASE WHEN fr.senderId = :userId THEN fr.receiverId ELSE fr.senderId END',
      )
      .where('(fr.senderId = :userId OR fr.receiverId = :userId)', { userId })
      .andWhere('fr.status = :status', { status: 'ACCEPTED' })
      .select([
        'fr.id AS "friendshipId"',
        'fr."createdAt" AS "friendsSince"',
        'u.id AS "friend_id"',
        'u.name AS "friend_name"',
        'u.username AS "friend_username"',
        'u.email AS "friend_email"',
        'u.avatar AS "friend_avatar"',
        'u.gender AS "friend_gender"',
        'u.age AS "friend_age"',
        'u.phoneNumber AS "friend_phoneNumber"',
      ])
      .orderBy('fr."createdAt"', 'DESC')
      .getRawMany();

    const friends = friendRequests.map((row) => ({
      friendshipId: row.friendshipId,
      friendsSince: row.friendsSince,
      friend: {
        id: row.friend_id,
        name: row.friend_name,
        username: row.friend_username,
        email: row.friend_email,
        avatar: row.friend_avatar,
        gender: row.friend_gender,
        age: row.friend_age,
        phoneNumber: row.friend_phoneNumber,
      },
    }));

    return {
      message: 'Friends fetched successfully',
      count: friends.length,
      friends,
    };
  }

  async sendFriendRequest(userId: number, receiverId: number) {
    const senderId = userId;

    if (senderId === receiverId) {
      return {
        message: 'You cannot send a friend request to yourself',
      };
    }

    const existingRequest = await this.friendRequestRepository.findOne({
      where: [
        { senderId, receiverId, status: 'PENDING' },
        { senderId: receiverId, receiverId: senderId, status: 'PENDING' },
        { senderId, receiverId, status: 'ACCEPTED' },
        { senderId: receiverId, receiverId: senderId, status: 'ACCEPTED' },
      ],
    });

    if (existingRequest) {
      return {
        message: 'A friend request already exists between these users',
        request: existingRequest,
      };
    }

    const newRequest = this.friendRequestRepository.create({
      senderId,
      receiverId,
      status: 'PENDING',
    });

    await this.friendRequestRepository.save(newRequest);
    const sender = await this.userRepository.findOne({
      where: { id: senderId },
      select: ['id', 'name', 'avatar'],
    });
    await this.notificationService.notify(receiverId, 'FRIEND_REQUEST_SENT', {
      senderId: sender?.id,
      senderName: sender?.name,
      senderAvatar: sender?.avatar,
    });

    return {
      message: 'Friend request sent successfully',
      request: newRequest,
    };
  }

  async getAllFriendRequests(userId: number) {
    const raw = await this.friendRequestRepository
      .createQueryBuilder('fr')
      .innerJoin('users', 'u', 'u.id = fr."senderId"')
      .where('fr."receiverId" = :userId', { userId })
      .andWhere('fr.status = :status', { status: 'PENDING' })
      .orderBy('fr."createdAt"', 'DESC')
      .select([
        'fr.id AS "requestId"',
        'fr.status AS "status"',
        'fr."createdAt" AS "createdAt"',
        'u.id AS "sender_id"',
        'u.name AS "sender_name"',
        'u.avatar AS "sender_avatar"',
      ])
      .getRawMany();

    const requests = raw.map((r) => ({
      id: r.requestId,
      status: r.status,
      createdAt: r.createdAt,
      sender: {
        id: r.sender_id,
        name: r.sender_name,
        avatar: r.sender_avatar,
      },
    }));

    return {
      message: 'All friend requests fetched successfully',
      requests,
    };
  }

  async acceptFriendRequest(userId: number, requestId: number) {
    // Find the friend request
    const request = await this.friendRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      return { message: 'Friend request not found' };
    }

    // Only the receiver can accept the request
    if (request.receiverId !== userId) {
      return {
        message: 'You are not authorized to accept this friend request',
      };
    }

    // If request is already accepted or rejected, do nothing
    if (request.status !== 'PENDING') {
      return {
        message: `Friend request is already ${request.status.toLowerCase()}`,
      };
    }

    request.status = 'ACCEPTED';
    await this.friendRequestRepository.save(request);
    const receiver = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'name'],
    });
    await this.notificationService.notify(
      request.senderId,
      'FRIEND_REQUEST_ACCEPTED',
      {
        receiverId: receiver?.id,
        receiverName: receiver?.name,
      },
    );

    // (Optional) Add code to update user's friends list if needed

    return {
      message: 'Friend request accepted successfully',
      request,
    };
  }

  async rejectFriendRequest(userId: number, requestId: number) {
    const request = await this.friendRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      return { message: 'Friend request not found' };
    }

    // Only the receiver can accept the request
    if (request.receiverId !== userId) {
      return {
        message: 'You are not authorized to accept this friend request',
      };
    }

    // If request is already accepted or rejected, do nothing
    if (request.status !== 'PENDING') {
      return {
        message: `Friend request is already ${request.status.toLowerCase()}`,
      };
    }

    request.status = 'REJECTED';
    await this.friendRequestRepository.save(request);
    const receiver = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'name'],
    });
    await this.notificationService.notify(
      request.senderId,
      'FRIEND_REQUEST_REJECTED',
      {
        receiverId: receiver?.id,
        receiverName: receiver?.name,
      },
    );

    return {
      message: 'Friend request rejected successfully',
      request,
    };
  }

  async getAllNonAcceptedUser(userId: number) {
    // Get IDs of users with PENDING or ACCEPTED relationships
    const excludedUserIds = await this.friendRequestRepository
      .createQueryBuilder('fr')
      .select(
        'CASE WHEN fr.senderId = :userId THEN fr.receiverId ELSE fr.senderId END',
        'userId',
      )
      .where('(fr.senderId = :userId OR fr.receiverId = :userId)', { userId })
      .andWhere('fr.status IN (:...statuses)', {
        statuses: ['PENDING', 'ACCEPTED'],
      })
      .getRawMany();

    const excludedIds = excludedUserIds.map((row) => row.userId);

    // Query users excluding those IDs
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.id != :userId', { userId });

    if (excludedIds.length > 0) {
      queryBuilder.andWhere('user.id NOT IN (:...excludedIds)', {
        excludedIds,
      });
    }

    const users = await queryBuilder
      .select([
        'user.id',
        'user.name',
        'user.username',
        'user.email',
        'user.avatar',
        'user.gender',
        'user.age',
        'user.phoneNumber',
        'user.createdAt',
      ])
      .getMany();

    return {
      message: 'Users who are not friends fetched successfully',
      users,
    };
  }

  async unfriend(userId: number, friendId: number) {
    await this.friendRequestRepository.delete({
      status: 'ACCEPTED',
      senderId: In([userId, friendId]),
      receiverId: In([userId, friendId]),
    });

    return { message: 'Unfriended successfully' };
  }
}
