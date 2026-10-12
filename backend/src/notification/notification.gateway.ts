import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  /** socketId -> userId, so we can clean up on disconnect. */
  private socketUsers = new Map<string, number>();

  constructor(private readonly jwtService: JwtService) {}

  private userRoom(userId: number): string {
    return `user:${userId}`;
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

      const payload = await this.jwtService.verifyAsync<{ sub: number }>(token);
      const userId: number = payload.sub;
      if (!userId) {
        client.emit('error', {
          code: 'UNAUTHORIZED',
          message: 'Invalid token payload',
        });
        client.disconnect();
        return;
      }

      (client.data as { user?: { userId: number } }).user = { userId };
      this.socketUsers.set(client.id, userId);
      // Reconnects re-join automatically, so notifications survive network blips.
      await client.join(this.userRoom(userId));
    } catch {
      client.emit('error', {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.socketUsers.delete(client.id);
  }

  sendToUser(userId: number, event: string, data: unknown) {
    this.server.to(this.userRoom(userId)).emit(event, data);
  }
}
