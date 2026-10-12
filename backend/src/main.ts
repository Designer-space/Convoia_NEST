import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { getCorsOrigins, getEnv } from './config/env';

async function bootstrap() {
  const env = getEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: false,
  });

  // Correct client IP behind Render/Cloudflare so rate limits key on the real IP.
  app.set('trust proxy', env.TRUST_PROXY);

  // Explicit CORS allowlist. `*` is incompatible with credentialed requests,
  // and the refresh cookie requires credentials.
  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  await app.listen(env.PORT);
  new Logger('Bootstrap').log(`Convoia API listening on port ${env.PORT}`);
}

void bootstrap();
