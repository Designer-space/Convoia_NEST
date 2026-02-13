import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from './entity/user.entity';
import { Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getAllUsers(userId: number) {
    const users = await this.userRepository.find({
      where: { id: Not(userId) },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        gender: true,
        age: true,
      },
    });

    if (!users || users.length === 0) {
      throw new NotFoundException('No users found');
    }
    return {
      message: 'Users fetched successfully',
      users,
    };
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
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      message: 'User fetched successfully',
      user,
    };
  }

  async updatePersonalProfile(userId: number, updateData: Partial<User>) {
    const allowedUpdates = {
      name: updateData.name,
      username: updateData.username,
      gender: updateData.gender,
      age: updateData.age,
      phoneNumber: updateData.phoneNumber,
      avatar: updateData.avatar,
      avatarPublicId: updateData.avatarPublicId,
    };

    const result = await this.userRepository.update(
      { id: userId },
      allowedUpdates,
    );

    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.userRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
      },
    });

    return {
      message: 'User updated successfully',
      user: updatedUser,
    };
  }
}
