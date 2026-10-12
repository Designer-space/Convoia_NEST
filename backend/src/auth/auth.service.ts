import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { User } from '../user/entity/user.entity';
import { RefreshToken } from './entity/refresh-token.entity';
import { getEnv } from '../config/env';

const BCRYPT_ROUNDS = 12;

/**
 * Lazily-computed hash used to equalise timing when the account does not exist.
 * Computed at runtime so it is always a valid bcrypt hash.
 */
let dummyHashPromise: Promise<string> | null = null;

/** Burn the same bcrypt work as a real login check, for unknown emails. */
async function compareAgainstDummy(password: string): Promise<boolean> {
  const hash = await (dummyHashPromise ??= bcrypt.hash(
    'invalid-password-placeholder',
    BCRYPT_ROUNDS,
  ));
  await bcrypt.compare(password, hash);
  return false;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshMaxAgeMs: number;
}

export interface PublicUser {
  id: number;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatar: user.avatar ?? null,
    };
  }

  private signAccessToken(user: User): string {
    return this.jwtService.sign({ sub: user.id, email: user.email });
  }

  private get refreshMaxAgeMs(): number {
    return getEnv().JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
  }

  /** Create a refresh token row and return the raw token (never stored). */
  private async issueRefreshToken(
    userId: number,
    deviceInfo: string | null,
    ip: string | null,
    familyId?: string,
  ): Promise<string> {
    const raw = randomBytes(48).toString('base64url');
    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        userId,
        tokenHash: sha256(raw),
        familyId: familyId ?? randomUUID(),
        deviceInfo,
        ip,
        expiresAt: new Date(Date.now() + this.refreshMaxAgeMs),
      }),
    );
    return raw;
  }

  private async issueTokens(
    user: User,
    deviceInfo: string | null,
    ip: string | null,
    familyId?: string,
  ): Promise<AuthTokens> {
    const refreshToken = await this.issueRefreshToken(
      user.id,
      deviceInfo,
      ip,
      familyId,
    );
    return {
      accessToken: this.signAccessToken(user),
      refreshToken,
      refreshMaxAgeMs: this.refreshMaxAgeMs,
    };
  }

  async register(
    input: { name: string; username: string; email: string; password: string },
    deviceInfo: string | null,
    ip: string | null,
  ): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const { name, username, email, password } = input;

    const existing = await this.userRepository
      .createQueryBuilder('u')
      .where('u.email = :email', { email })
      .orWhere('u.username = :username', { username })
      .getOne();

    if (existing) {
      const field =
        existing.email.toLowerCase() === email.toLowerCase()
          ? 'email'
          : 'username';
      throw new ConflictException(`That ${field} is already in use`);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = this.userRepository.create({
      name,
      username,
      email,
      password: hashedPassword,
    });

    try {
      await this.userRepository.save(user);
    } catch (err) {
      // Race between the check above and the insert: unique_violation.
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException('That email or username is already in use');
      }
      throw err;
    }

    const tokens = await this.issueTokens(user, deviceInfo, ip);
    return { user: this.toPublicUser(user), tokens };
  }

  async login(
    email: string,
    password: string,
    deviceInfo: string | null,
    ip: string | null,
  ): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const user = await this.userRepository
      .createQueryBuilder('u')
      .where('u.email = :email', { email })
      .addSelect('u.password')
      .getOne();

    // Always run a bcrypt comparison so unknown emails take the same time as
    // wrong passwords (prevents account enumeration via timing).
    const valid = user
      ? await bcrypt.compare(password, user.password)
      : await compareAgainstDummy(password);

    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.issueTokens(user, deviceInfo, ip);
    return { user: this.toPublicUser(user), tokens };
  }

  /**
   * Rotate a refresh token. Detects reuse of an already-rotated token and
   * revokes the whole token family in that case.
   */
  async refresh(
    rawToken: string,
    deviceInfo: string | null,
    ip: string | null,
  ): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const tokenHash = sha256(rawToken);
    const record = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!record) {
      throw new UnauthorizedException('Session expired');
    }

    // Reuse of a rotated/revoked token => assume the token was stolen.
    if (record.revokedAt) {
      await this.revokeFamily(record.familyId);
      throw new UnauthorizedException('Session expired');
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      await this.refreshTokenRepository.update(record.id, {
        revokedAt: new Date(),
      });
      throw new UnauthorizedException('Session expired');
    }

    const user = await this.userRepository.findOne({
      where: { id: record.userId },
    });
    if (!user) {
      await this.revokeFamily(record.familyId);
      throw new UnauthorizedException('Session expired');
    }

    const tokens = await this.issueTokens(
      user,
      deviceInfo,
      ip,
      record.familyId,
    );

    await this.refreshTokenRepository.update(record.id, {
      revokedAt: new Date(),
      replacedBy: sha256(tokens.refreshToken),
    });

    return { user: this.toPublicUser(user), tokens };
  }

  /** Revoke every token in a family (used on logout and reuse detection). */
  async revokeFamily(familyId: string): Promise<void> {
    await this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('"familyId" = :familyId AND "revokedAt" IS NULL', { familyId })
      .execute();
  }

  /** Revoke the family a raw token belongs to (logout). */
  async revokeByToken(rawToken: string): Promise<void> {
    if (!rawToken) return;
    const record = await this.refreshTokenRepository.findOne({
      where: { tokenHash: sha256(rawToken) },
    });
    if (record) await this.revokeFamily(record.familyId);
  }
}
