import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('conversation_participants')
@Unique(['conversationId', 'userId'])
export class ConversationParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  conversationId: number;

  @ManyToOne(() => Conversation, (c) => c.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Index()
  @Column()
  userId: number;

  /** For future: admin, member, etc. */
  @Column({ type: 'varchar', length: 20, default: 'member' })
  role: string;

  /**
   * Highest conversation `seq` this participant has seen. Unread count is
   * `conversation.lastSeq - lastReadSeq` — O(1) and duplicate-free.
   */
  @Column({ type: 'bigint', default: 0 })
  lastReadSeq: string;

  /** For read receipts: last time this user read messages in this conversation */
  @Column({ type: 'timestamptz', nullable: true })
  lastReadAt: Date | null;

  @CreateDateColumn()
  joinedAt: Date;
}
