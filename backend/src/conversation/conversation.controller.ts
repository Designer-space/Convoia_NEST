import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import type { AuthedRequest } from '../auth/types/authed-request';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
  ) {}

  @Get()
  getConversations(@Req() req: AuthedRequest) {
    return this.conversationService.getConversationsForUser(req.user.userId);
  }

  @Post()
  async createConversation(
    @Req() req: AuthedRequest,
    @Body() body: CreateConversationDto,
  ) {
    const conversation = await this.conversationService.createConversation(
      req.user.userId,
      {
        type: body.type,
        participantIds: body.participantIds,
        name: body.name,
      },
    );
    return {
      conversation: {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        createdAt: conversation.createdAt,
      },
    };
  }

  @Get(':id')
  async getConversation(
    @Req() req: AuthedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const conversation = await this.conversationService.getConversationById(
      id,
      req.user.userId,
    );
    return {
      conversation: {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        lastMessageId: conversation.lastMessageId,
        lastMessageAt: conversation.lastMessageAt,
        lastMessagePreview: conversation.lastMessagePreview,
        lastSeq: Number(conversation.lastSeq),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    };
  }

  @Get(':id/messages')
  getMessages(
    @Req() req: AuthedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
    @Query('after') after?: string,
  ) {
    const limitNum = limit
      ? Math.min(100, Math.max(1, parseInt(limit, 10) || 50))
      : 50;
    return this.messageService.getMessages(
      id,
      req.user.userId,
      limitNum,
      before,
      after,
    );
  }

  @Post(':id/messages')
  async sendMessage(
    @Req() req: AuthedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SendMessageDto,
  ) {
    const message = await this.messageService.sendMessage(id, req.user.userId, {
      content: body.content ?? null,
      replyToMessageId: body.replyToMessageId ?? null,
      clientMsgId: body.clientMsgId ?? null,
    });
    return { data: message };
  }

  @Post(':id/read')
  async markAsRead(
    @Req() req: AuthedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: MarkReadDto,
  ) {
    return this.messageService.markAsRead(
      id,
      req.user.userId,
      body.lastReadSeq,
    );
  }
}
