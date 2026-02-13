import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity("friendrequest")
export class FriendRequest {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    senderId: number;

    @Column()
    receiverId: number;

    @Column()
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED'

    @CreateDateColumn()
    createdAt: Date;
}