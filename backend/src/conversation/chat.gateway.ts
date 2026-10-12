import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConversationService } from './conversation.service';

interface ChatSocketData {
  user?: { userId: number; email: string };
}

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly conversationService: ConversationService,
    private readonly jwtService: JwtService,
  ) {}

  private socketData(client: Socket): ChatSocketData {
    return client.data as ChatSocketData;
  }

  private userRoom(userId: number): string {
    return `user:${userId}`;
  }

  private conversationRoom(conversationId: number): string {
    return `conversation:${conversationId}`;
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as { token?: string } | undefined;
    if (auth?.token) return auth.token;

    const queryToken = client.handshake.query?.token;
    if (queryToken && typeof queryToken === 'string') return queryToken;

    const authHeader = client.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.substring(7);

    return null;
  }

  /**
   * On every connection (including reconnects) authenticate, then join the
   * user's personal room and every conversation they belong to. Socket.IO rooms
   * are lost on reconnect, so this is what makes realtime survive a network blip.
   */
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.emit('error', {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        email: string;
      }>(token);
      const userId = payload.sub;
      if (!userId) {
        client.emit('error', {
          code: 'UNAUTHORIZED',
          message: 'Invalid token payload',
        });
        client.disconnect();
        return;
      }

      this.socketData(client).user = { userId, email: payload.email };

      await client.join(this.userRoom(userId));

      const conversationIds =
        await this.conversationService.getConversationIdsForUser(userId);
      for (const id of conversationIds) {
        await client.join(this.conversationRoom(id));
      }

      client.emit('connected', { userId, conversationIds });
    } catch {
      client.emit('error', {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Socket.IO removes the socket from rooms automatically.
    this.socketData(client).user = undefined;
  }

  /** Explicit join, kept for clients that want to be sure a room is joined. */
  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId?: number },
  ) {
    const userId = this.socketData(client).user?.userId;
    if (!userId) {
      client.emit('error', { code: 'UNAUTHORIZED', message: 'Unauthorized' });
      return;
    }

    const conversationId = Number(payload?.conversationId);
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      client.emit('error', {
        code: 'BAD_REQUEST',
        message: 'Invalid conversationId',
      });
      return;
    }

    const isParticipant = await this.conversationService.isParticipant(
      conversationId,
      userId,
    );
    if (!isParticipant) {
      client.emit('error', {
        code: 'FORBIDDEN',
        message: 'Not a participant of this conversation',
      });
      return;
    }
    await client.join(this.conversationRoom(conversationId));
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId?: number },
  ) {
    const conversationId = Number(payload?.conversationId);
    if (!Number.isInteger(conversationId)) return;
    await client.leave(this.conversationRoom(conversationId));
  }

  /** Broadcast a new message to the conversation room. */
  emitNewMessage(conversationId: number, message: Record<string, unknown>) {
    this.server
      .to(this.conversationRoom(conversationId))
      .emit('new_message', message);
    this.server
      .to(this.conversationRoom(conversationId))
      .emit('conversation:updated', { conversationId });
  }

  /** Broadcast a read-state update to the conversation. */
  emitReadUpdated(conversationId: number, userId: number, lastReadSeq: number) {
    this.server.to(this.conversationRoom(conversationId)).emit('read_updated', {
      conversationId,
      userId,
      lastReadSeq,
    });
  }

  emitToUser(userId: number, event: string, data: unknown) {
    this.server.to(this.userRoom(userId)).emit(event, data);
  }

  emitTyping(conversationId: number, userId: number, isTyping: boolean) {
    this.server
      .to(this.conversationRoom(conversationId))
      .emit('typing', { conversationId, userId, isTyping });
  }
}
