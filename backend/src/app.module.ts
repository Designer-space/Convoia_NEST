import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { RequestModule } from './request/request.module';
import * as dotenv from 'dotenv';
import { NotificationModule } from './notification/notification.module';
import { ConversationModule } from './conversation/conversation.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

dotenv.config();
@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.PGADMIN_URI,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV === 'development',
    }),
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/chat'),
    UserModule,
    AuthModule,
    RequestModule,
    NotificationModule,
    ConversationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
