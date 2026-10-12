import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  parseCookies,
  setRefreshCookie,
} from '../config/cookies';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private clientMeta(req: Request) {
    return {
      deviceInfo: (req.headers['user-agent'] as string) ?? null,
      ip: req.ip ?? null,
    };
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { deviceInfo, ip } = this.clientMeta(req);
    const { user, tokens } = await this.authService.register(
      dto,
      deviceInfo,
      ip,
    );
    setRefreshCookie(res, tokens.refreshToken, tokens.refreshMaxAgeMs);
    return { user, accessToken: tokens.accessToken };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { deviceInfo, ip } = this.clientMeta(req);
    const { user, tokens } = await this.authService.login(
      dto.email,
      dto.password,
      deviceInfo,
      ip,
    );
    setRefreshCookie(res, tokens.refreshToken, tokens.refreshMaxAgeMs);
    return { user, accessToken: tokens.accessToken };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = parseCookies(req.headers.cookie)[REFRESH_COOKIE];
    if (!raw) throw new UnauthorizedException('Session expired');

    const { deviceInfo, ip } = this.clientMeta(req);
    try {
      const { user, tokens } = await this.authService.refresh(
        raw,
        deviceInfo,
        ip,
      );
      setRefreshCookie(res, tokens.refreshToken, tokens.refreshMaxAgeMs);
      return { user, accessToken: tokens.accessToken };
    } catch (err) {
      clearRefreshCookie(res);
      throw err;
    }
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = parseCookies(req.headers.cookie)[REFRESH_COOKIE];
    await this.authService.revokeByToken(raw ?? '');
    clearRefreshCookie(res);
    return { success: true };
  }
}
