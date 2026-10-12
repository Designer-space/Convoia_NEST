import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config({ quiet: true });

/**
 * Single source of truth for environment configuration.
 *
 * The schema is validated once, lazily, on first access. Invalid configuration
 * throws immediately with a readable list of problems so the process fails fast
 * at boot instead of surfacing `undefined` deep inside a request handler.
 */
const EnvSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),

    // Auth
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    COOKIE_DOMAIN: z.string().optional(),
    /** `secure` cookies require HTTPS; disabled automatically in development. */
    COOKIE_SECURE: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),

    // Databases (pooled at runtime for the app, unpooled for migrations)
    PGADMIN_URI: z.string().min(1, 'PGADMIN_URI is required'),
    DATABASE_URL_UNPOOLED: z.string().optional(),
    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

    // Media
    CLOUDINARY_NAME: z.string().min(1, 'CLOUDINARY_NAME is required'),
    CLOUDINARY_KEY: z.string().min(1, 'CLOUDINARY_KEY is required'),
    CLOUDINARY_SECRET: z.string().min(1, 'CLOUDINARY_SECRET is required'),

    // HTTP
    /** Comma-separated list of allowed browser origins. */
    CORS_ORIGINS: z.string().default('http://localhost:3000'),
    /** Number of proxy hops to trust when reading the client IP. */
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(1),
  })
  .superRefine((val, ctx) => {
    // Enforce a strong secret in production while keeping local dev usable.
    if (val.NODE_ENV === 'production' && val.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must be at least 32 characters in production',
      });
    }
    if (val.NODE_ENV === 'production' && !process.env.CORS_ORIGINS) {
      ctx.addIssue({
        code: 'custom',
        path: ['CORS_ORIGINS'],
        message: 'CORS_ORIGINS must be explicitly set in production',
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

/** Validate and return the environment. Throws on invalid configuration. */
export function getEnv(): Env {
  if (cached) return cached;

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map(
        (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`,
      )
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  cached = parsed.data;
  return cached;
}

export function getJwtSecret(): string {
  return getEnv().JWT_SECRET;
}

/** Parse `CORS_ORIGINS` into a trimmed, non-empty list. */
export function getCorsOrigins(): string[] {
  return getEnv()
    .CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
