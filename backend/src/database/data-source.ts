import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config({ quiet: true });
import { User } from '../user/entity/user.entity';
import { FriendRequest } from '../request/entity/friendrequest.entity';
import { Conversation } from '../conversation/entity/conversation.entity';
import { ConversationParticipant } from '../conversation/entity/conversation-participant.entity';
import { Notification } from '../notification/entity/notification.entity';
import { RefreshToken } from '../auth/entity/refresh-token.entity';

/**
 * Entity list shared by the runtime module and the migration CLI. Keep this as
 * the single source of truth so `migration:generate` never misses a table.
 */
export const entities = [
  User,
  FriendRequest,
  Conversation,
  ConversationParticipant,
  Notification,
  RefreshToken,
];

/**
 * Migrations run against the *direct* (unpooled) Neon URL. Runtime traffic uses
 * the pooled URL — see `app.module.ts`.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL_UNPOOLED ?? process.env.PGADMIN_URI,
  entities,
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  migrationsTableName: 'typeorm_migrations',
  ssl: { rejectUnauthorized: false },
});
