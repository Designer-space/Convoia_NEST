import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConversationService } from './conversation.service';
import { getJwtSecret } from 'src/config/env';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  /** socketId -> { userId, conversationIds[] } for cleanup */
  private socketMeta = new Map<string, { userId: number; conversationIds: Set<number> }>();

  constructor(
    private conversationService: ConversationService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: getJwtSecret(),
      });
      const userId = payload.sub;
      if (!userId) {
        client.emit('error', { message: 'Invalid token payload' });
        client.disconnect();
        return;
      }

      client.data.user = { userId, email: payload.email };
      this.socketMeta.set(client.id, { userId, conversationIds: new Set() });
    } catch (error) {
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect();
    }
  }

  private extractToken(client: Socket): string | null {
    // Try auth.token first (recommended), then query.token, then headers
    const authToken = client.handshake.auth?.token;
    if (authToken) return authToken;

    const queryToken = client.handshake.query?.token;
    if (queryToken && typeof queryToken === 'string') return queryToken;

    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  handleDisconnect(client: Socket) {
    this.socketMeta.delete(client.id);
  }

  /** Client joins a conversation room (they must be participant) */
  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    client: Socket,
    payload: { conversationId: number },
  ) {
    const userId = client.data?.user?.userId;
    if (!userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const meta = this.socketMeta.get(client.id);
    if (!meta) {
      client.emit('error', { message: 'Socket not found' });
      return;
    }

    const { conversationId } = payload;
    const isParticipant = await this.conversationService.isParticipant(
      conversationId,
      userId,
    );
    if (!isParticipant) {
      client.emit('error', { message: 'Not a participant of this conversation' });
      return;
    }
    const room = `conversation:${conversationId}`;
    await client.join(room);
    meta.conversationIds.add(conversationId);
  }

  /** Client leaves a conversation room */
  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(client: Socket, payload: { conversationId: number }) {
    const room = `conversation:${payload.conversationId}`;
    client.leave(room);
    const meta = this.socketMeta.get(client.id);
    if (meta) meta.conversationIds.delete(payload.conversationId);
  }

  /** Emit new message to all clients in the conversation room (called from MessageService) */
  emitNewMessage(conversationId: number, message: Record<string, unknown>) {
    const room = `conversation:${conversationId}`;
    this.server.to(room).emit('new_message', message);
  }

  /** Future: typing indicator */
  emitTyping(conversationId: number, userId: number, isTyping: boolean) {
    const room = `conversation:${conversationId}`;
    this.server.to(room).emit('typing', { userId, isTyping });
  }

  /** Future: read receipt broadcast */
  emitReadReceipt(conversationId: number, userId: number, messageIds: string[]) {
    const room = `conversation:${conversationId}`;
    this.server.to(room).emit('read_receipt', { userId, messageIds });
  }
}
