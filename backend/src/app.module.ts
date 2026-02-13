import { Module } from '@nestjs/common';
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

dotenv.config();
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.PGADMIN_URI,
      // host: process.env.DB_HOST || 'localhost',
      // port: parseInt(process.env.DB_PORT || '5432'),
      // username: process.env.DB_USER || 'postgres',
      // password: process.env.DB_PASSWORD || '123456',
      // database: process.env.DB_NAME || 'postgres',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/chat'),
    UserModule,
    AuthModule,
    RequestModule,
    NotificationModule,
    ConversationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
