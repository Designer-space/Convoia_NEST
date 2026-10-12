import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { getJwtSecret } from 'src/config/env';

/**
 * Guard for the Socket.IO connection handshake (before the connection is
 * established). Use it in a gateway's `handleConnection` or as middleware.
 */
@Injectable()
export class WsJwtConnectionGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token = this.extractTokenFromSocket(client);

    if (!token) {
      client.emit('error', { message: 'Authentication required' });
      client.disconnect();
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        email: string;
      }>(token, { secret: getJwtSecret() });
      (client.data as { user?: unknown }).user = {
        userId: payload.sub,
        email: payload.email,
      };
      return true;
    } catch {
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect();
      return false;
    }
  }

  private extractTokenFromSocket(client: Socket): string | null {
    const auth = client.handshake.auth as { token?: string } | undefined;
    if (auth?.token) return auth.token;

    const queryToken = client.handshake.query?.token;
    if (queryToken && typeof queryToken === 'string') return queryToken;

    const authHeader = client.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
