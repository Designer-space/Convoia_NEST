import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

/**
 * Guard for Socket.IO connection handshake (before connection is established)
 * Use this in the gateway's handleConnection or as a middleware
 */
@Injectable()
export class WsJwtConnectionGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractTokenFromSocket(client);

    if (!token) {
      client.emit('error', { message: 'Authentication required' });
      client.disconnect();
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'default',
      });
      // Attach user info to socket data
      client.data.user = { userId: payload.sub, email: payload.email };
      return true;
    } catch (error) {
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect();
      return false;
    }
  }

  private extractTokenFromSocket(client: Socket): string | null {
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
}
