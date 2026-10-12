import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Opaque refresh tokens. Only the SHA-256 hash of the token is stored, so a
 * database leak does not expose usable tokens.
 *
 * Tokens form a "family": every rotation issues a new token in the same family
 * and marks the previous one as replaced. If a token that was already replaced
 * is presented again we treat it as theft and revoke the whole family.
 */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: number;

  @Column({ type: 'varchar', length: 128, unique: true })
  tokenHash: string;

  /** Stable id shared by every token descended from the same login. */
  @Index()
  @Column({ type: 'uuid' })
  familyId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceInfo: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  /** Hash of the token that replaced this one during rotation. */
  @Column({ type: 'varchar', length: 128, nullable: true })
  replacedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
