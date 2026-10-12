import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { RequestModule } from './request/request.module';
import { NotificationModule } from './notification/notification.module';
import { ConversationModule } from './conversation/conversation.module';
import { HealthModule } from './health/health.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { entities } from './database/data-source';
import { getEnv } from './config/env';

const env = getEnv();

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: env.PGADMIN_URI,
      entities,
      // Schema is owned by migrations. Never let the app mutate it implicitly.
      synchronize: false,
      migrationsRun: false,
      ssl: { rejectUnauthorized: false },
      retryAttempts: 3,
    }),
    MongooseModule.forRoot(env.MONGO_URI),
    UserModule,
    AuthModule,
    RequestModule,
    NotificationModule,
    ConversationModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
