import type { Response } from 'express';
import { getEnv } from './env';

export const REFRESH_COOKIE = 'refresh_token';

/** Minimal cookie header parser (avoids pulling in `cookie-parser`). */
export function parseCookies(
  header: string | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

function cookieOptions() {
  const env = getEnv();
  return {
    httpOnly: true,
    // Secure cookies are impossible over plain http://localhost, so only force
    // them on when explicitly configured or running in production.
    secure: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setRefreshCookie(
  res: Response,
  token: string,
  maxAgeMs: number,
) {
  res.cookie(REFRESH_COOKIE, token, { ...cookieOptions(), maxAge: maxAgeMs });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
}
