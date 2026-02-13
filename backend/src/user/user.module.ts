import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/auth/strategy/jwt.strategy';

@Module({
  imports: [TypeOrmModule.forFeature([User]), JwtModule.register({
    secret: process.env.JWT_SECRET || 'default',
    signOptions: { expiresIn: '1h' },
  })],
  controllers: [UserController],
  providers: [UserService]
})
export class UserModule {}
