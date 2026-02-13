import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
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

  @Column()
  userId: number;

  /** For future: admin, member, etc. */
  @Column({ type: 'varchar', length: 20, default: 'member' })
  role: string;

  /** For read receipts: last time this user read messages in this conversation */
  @Column({ type: 'timestamptz', nullable: true })
  lastReadAt: Date | null;

  @CreateDateColumn()
  joinedAt: Date;
}
