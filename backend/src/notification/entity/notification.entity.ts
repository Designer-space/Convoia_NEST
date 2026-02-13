import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
  } from "typeorm";
  
  @Entity("notifications")
  export class Notification {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    userId: number; // receiver
  
    @Column()
    type: string;
  
    @Column("jsonb", { nullable: true })
    payload: any;
  
    @Column({ default: false })
    isRead: boolean;
  
    @CreateDateColumn()
    createdAt: Date;
  }
  