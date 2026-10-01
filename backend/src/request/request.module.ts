import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { RequestController } from './request.controller';
import { RequestService } from './request.service';
import { FriendRequest } from './entity/friendrequest.entity.js';
import { User } from '../user/entity/user.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { getJwtSecret } from 'src/config/env';

@Module({
    imports: [
        TypeOrmModule.forFeature([FriendRequest, User]),
        NotificationModule,
        JwtModule.register({
            secret: getJwtSecret(),
            signOptions: { expiresIn: '1h' },
        })
    ],
    controllers: [RequestController],
    providers: [RequestService]
})
export class RequestModule {}
