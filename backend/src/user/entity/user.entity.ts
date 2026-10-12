import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

/** Privacy preferences controlling which profile fields friends can see. */
export interface IUserPrivacy {
  showEmailToFriends: boolean;
  showPhoneToFriends: boolean;
}

export const DEFAULT_PRIVACY: IUserPrivacy = {
  showEmailToFriends: true,
  showPhoneToFriends: true,
};

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  /** Case-insensitive unique handle (citext). */
  @Column({ type: 'citext', unique: true })
  username: string;

  @Column({ type: 'enum', enum: ['male', 'female', 'other'], nullable: true })
  gender: 'male' | 'female' | 'other' | null;

  @Column({ nullable: true })
  age: number;

  @Column({ nullable: true })
  phoneNumber: string;

  /** Case-insensitive unique email (citext). */
  @Column({ type: 'citext', unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  avatarPublicId: string;

  // Text form must match what Postgres reports for a jsonb default, otherwise
  // every `migration:generate` would emit a spurious diff.
  @Column({
    type: 'jsonb',
    default: () => `'{"showEmailToFriends": true, "showPhoneToFriends": true}'`,
  })
  privacy: IUserPrivacy;

  /** Last time any socket for this user was connected (presence). */
  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
