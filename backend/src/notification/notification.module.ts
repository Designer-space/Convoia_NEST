import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Notification } from './entity/notification.entity';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { getJwtSecret } from 'src/config/env';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    JwtModule.register({
      secret: getJwtSecret(),
    }),
  ],
  providers: [
    NotificationService,
    NotificationGateway,
  ],
  exports: [
    NotificationService,
  ],
})
export class NotificationModule {}
