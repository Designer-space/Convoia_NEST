import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum FriendRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('friendrequest')
// One live relationship per unordered pair. Terminal states (REJECTED /
// CANCELLED) are excluded so a new request can be created after a cooldown.
@Index(['userLowId', 'userHighId'], {
  unique: true,
  where: `"status" IN ('PENDING', 'ACCEPTED')`,
})
export class FriendRequest {
  @PrimaryGeneratedColumn()
  id: number;

  /** Original requester. */
  @Column()
  senderId: number;

  /** Original receiver. */
  @Column()
  receiverId: number;

  /** Ordered pair: LEAST(senderId, receiverId). */
  @Column()
  userLowId: number;

  /** Ordered pair: GREATEST(senderId, receiverId). */
  @Column()
  userHighId: number;

  @Column({
    type: 'enum',
    enum: FriendRequestStatus,
    default: FriendRequestStatus.PENDING,
  })
  status: FriendRequestStatus;

  /** When the receiver accepted/rejected (used for the re-request cooldown). */
  @Column({ type: 'timestamptz', nullable: true })
  respondedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
