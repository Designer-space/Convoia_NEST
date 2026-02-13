import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column()
  name: string;

  @Column()
  username: string;

  @Column({ type: 'enum', enum: ['male', 'female', 'other'], nullable: true })
  gender: 'male' | 'female' | 'other' | null;

  @Column({ nullable: true })
  age: number;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  avatarPublicId: string;

  @CreateDateColumn()
  createdAt: Date;
}
