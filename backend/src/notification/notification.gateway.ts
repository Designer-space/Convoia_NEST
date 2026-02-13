import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";

@WebSocketGateway({
  cors: { origin: "*" },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // userId -> set of socketIds
  private onlineUsers = new Map<number, Set<string>>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'default',
      });
      const userId = payload.sub;
      if (!userId) {
        client.emit('error', { message: 'Invalid token payload' });
        client.disconnect();
        return;
      }

      client.data.user = { userId, email: payload.email };
      const sockets = this.onlineUsers.get(userId) || new Set();
      sockets.add(client.id);
      this.onlineUsers.set(userId, sockets);
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
    for (const [userId, sockets] of this.onlineUsers.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.onlineUsers.delete(userId);
        }
        break;
      }
    }
  }

  sendToUser(userId: number, event: string, data: any) {
    const sockets = this.onlineUsers.get(userId);

    if (!sockets) return;

    sockets.forEach((socketId) => {
      this.server.to(socketId).emit(event, data);
    });
  }
}
