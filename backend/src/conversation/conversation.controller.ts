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

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
  ) {}

  @Get()
  async getConversations(@Req() req: any) {
    const userId = req.user.userId;
    return this.conversationService.getConversationsForUser(userId);
  }

  @Post()
  async createConversation(
    @Req() req: any,
    @Body() body: CreateConversationDto,
  ) {
    const userId = req.user.userId;
    const conversation = await this.conversationService.createConversation(userId, {
      type: body.type,
      participantIds: body.participantIds,
      name: body.name,
    });
    return {
      message: 'Conversation created successfully',
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
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = req.user.userId;
    const conversation = await this.conversationService.getConversationById(id, userId);
    return {
      message: 'Conversation fetched successfully',
      conversation: {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        lastMessageId: conversation.lastMessageId,
        lastMessageAt: conversation.lastMessageAt,
        lastMessagePreview: conversation.lastMessagePreview,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    };
  }

  @Get(':id/messages')
  async getMessages(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const userId = req.user.userId;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10) || 50) ) : 50;
    return this.messageService.getMessages(id, userId, limitNum, before);
  }

  @Post(':id/messages')
  async sendMessage(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SendMessageDto,
  ) {
    const userId = req.user.userId;
    const message = await this.messageService.sendMessage(id, userId, {
      content: body.content ?? null,
      replyToMessageId: body.replyToMessageId ?? null,
    });
    return {
      message: 'Message sent successfully',
      data: message,
    };
  }

  @Post(':id/read')
  async markAsRead(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: MarkReadDto,
  ) {
    const userId = req.user.userId;
    await this.messageService.markAsRead(id, userId, body.messageIds);
    return { message: 'Marked as read' };
  }
}
