import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { Conversation } from './entity/conversation.entity';
import { ConversationParticipant } from './entity/conversation-participant.entity';
import { FriendRequest } from '../request/entity/friendrequest.entity';
import { User } from '../user/entity/user.entity';
import { Message, MessageSchema } from './schema/message.schema';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { ConversationController } from './conversation.controller';
import { ChatGateway } from './chat.gateway';
import { getJwtSecret } from 'src/config/env';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationParticipant,
      FriendRequest,
      User,
    ]),
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    JwtModule.register({
      secret: getJwtSecret(),
    }),
  ],
  controllers: [ConversationController],
  providers: [ConversationService, MessageService, ChatGateway],
  exports: [ConversationService, MessageService],
})
export class ConversationModule {}
