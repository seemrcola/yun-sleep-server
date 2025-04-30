import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 9 })
  capacity: number;

  @Column({ default: 0 })
  current: number;

  @Column({ nullable: true })
  ownerId: number;

  @Column({ nullable: true })
  ownerName: string;

  @CreateDateColumn()
  createdAt: Date;
} 
