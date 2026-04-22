import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { User } from '~/modules/users/entity/user.entity';

@Entity({ name: 'notifications' })
@Index('idx_notifications_user_id', ['userId'])
@Index('idx_notifications_is_read', ['isRead'])
@Index('idx_notifications_created_at', ['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId: string;

  @Column({ name: 'type', type: 'varchar', length: 50, nullable: false })
  type: string;

  @Column({ name: 'title', type: 'varchar', length: 200, nullable: false })
  title: string;

  @Column({ name: 'message', type: 'text', nullable: false })
  message: string;

  @Column({ name: 'is_read', type: 'boolean', nullable: false, default: false })
  isRead: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @ManyToOne('User', 'notifications', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: User;
}
