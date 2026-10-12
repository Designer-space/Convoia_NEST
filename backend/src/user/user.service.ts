import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from './entity/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

const MAX_PAGE = 100;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getAllUsers(userId: number, search?: string, limit = 50, offset = 0) {
    const take = Math.min(MAX_PAGE, Math.max(1, limit));
    const skip = Math.max(0, offset);

    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.id != :userId', { userId })
      .select([
        'user.id',
        'user.name',
        'user.username',
        'user.avatar',
        'user.gender',
        'user.age',
      ])
      .orderBy('user.name', 'ASC')
      .take(take)
      .skip(skip);

    if (search && search.trim()) {
      qb.andWhere('(user.name ILIKE :q OR user.username ILIKE :q)', {
        q: `%${search.trim()}%`,
      });
    }

    const [users, total] = await qb.getManyAndCount();
    return { users, total, limit: take, offset: skip };
  }

  async getPersonalProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        gender: true,
        age: true,
        phoneNumber: true,
        avatar: true,
        privacy: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return { user };
  }

  async updatePersonalProfile(userId: number, updateData: Partial<User>) {
    const allowedUpdates: Partial<User> = {};
    if (updateData.name !== undefined) allowedUpdates.name = updateData.name;
    if (updateData.username !== undefined)
      allowedUpdates.username = updateData.username;
    if (updateData.gender !== undefined)
      allowedUpdates.gender = updateData.gender;
    if (updateData.age !== undefined) allowedUpdates.age = updateData.age;
    if (updateData.phoneNumber !== undefined)
      allowedUpdates.phoneNumber = updateData.phoneNumber;
    if (updateData.avatar !== undefined)
      allowedUpdates.avatar = updateData.avatar;
    if (updateData.avatarPublicId !== undefined)
      allowedUpdates.avatarPublicId = updateData.avatarPublicId;
    if (updateData.privacy !== undefined)
      allowedUpdates.privacy = updateData.privacy;

    if (Object.keys(allowedUpdates).length > 0) {
      try {
        const result = await this.userRepository.update(
          { id: userId },
          allowedUpdates,
        );
        if (result.affected === 0) {
          throw new NotFoundException('User not found');
        }
      } catch (err) {
        if ((err as { code?: string }).code === '23505') {
          throw new ConflictException('That username is already taken');
        }
        throw err;
      }
    }

    return this.getPersonalProfile(userId);
  }
}
