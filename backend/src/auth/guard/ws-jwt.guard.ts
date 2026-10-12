import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { getJwtSecret } from 'src/config/env';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token = this.extractTokenFromSocket(client);

    if (!token) {
      throw new UnauthorizedException('No token provided');
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
      throw new UnauthorizedException('Invalid token');
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
