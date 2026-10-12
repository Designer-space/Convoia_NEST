import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ConversationParticipant } from './conversation-participant.entity';

export enum ConversationType {
  DM = 'DM',
  GROUP = 'GROUP',
}

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, default: 'DM' })
  type: ConversationType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  /**
   * Deterministic key for DMs: `min(userIdA, userIdB)-max(userIdA, userIdB)`.
   * A unique index here makes concurrent DM creation idempotent. Null for groups.
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  dmKey: string | null;

  /** Monotonic per-conversation message sequence (drives ordering + unread). */
  @Column({ type: 'bigint', default: 0 })
  lastSeq: string;

  @OneToMany(() => ConversationParticipant, (p) => p.conversation)
  participants: ConversationParticipant[];

  /** Last message cache for chat list (MongoDB message id) */
  @Column({ type: 'varchar', length: 64, nullable: true })
  lastMessageId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null;

  /** Preview of last message (e.g. first 100 chars or "Photo", "File") */
  @Column({ type: 'varchar', length: 255, nullable: true })
  lastMessagePreview: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
