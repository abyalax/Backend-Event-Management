import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Event } from '~/modules/events/entities/event.entity';
import type { User } from '~/modules/users/entities/user.entity';
import type { Order } from '~/modules/orders/entities/order.entity';

export enum ReminderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum ReminderType {
  EMAIL = 'EMAIL',
  NOTIFICATION = 'NOTIFICATION',
  BOTH = 'BOTH',
}

@Entity({ name: 'event_reminders' })
@Index('idx_event_reminders_event_id', ['eventId'])
@Index('idx_event_reminders_user_id', ['userId'])
@Index('idx_event_reminders_order_id', ['orderId'])
@Index('idx_event_reminders_status', ['status'])
@Index('idx_event_reminders_scheduled_at', ['scheduledAt'])
@Index('idx_event_reminders_created_at', ['createdAt'])
export class EventReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid', nullable: false })
  eventId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: false })
  orderId: string;

  @Column({
    name: 'scheduled_at',
    type: 'timestamp with time zone',
    nullable: false,
  })
  scheduledAt: Date;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ReminderStatus,
    nullable: false,
    default: ReminderStatus.PENDING,
  })
  status: ReminderStatus;

  @Column({
    name: 'type',
    type: 'enum',
    enum: ReminderType,
    nullable: false,
    default: ReminderType.EMAIL,
  })
  type: ReminderType;

  @Column({ name: 'subject', type: 'varchar', length: 200, nullable: true })
  subject?: string | null;

  @Column({ name: 'message', type: 'text', nullable: true })
  message?: string | null;

  @Column({ name: 'sent_at', type: 'timestamp with time zone', nullable: true })
  sentAt?: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ name: 'retry_count', type: 'integer', nullable: false, default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', type: 'integer', nullable: false, default: 3 })
  maxRetries: number;

  @ManyToOne('Event', 'reminders', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id', referencedColumnName: 'id' })
  event: Event;

  @ManyToOne('User', 'reminders', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: User;

  @ManyToOne('Order', 'reminders', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id', referencedColumnName: 'id' })
  order: Order;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt?: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at' })
  deletedAt?: Date;
}
