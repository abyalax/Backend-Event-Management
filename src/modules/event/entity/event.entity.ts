import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Ticket } from '~/modules/ticket/entity/ticket.entity';
import type { EventCategory } from './event-category.entity';

@Entity({ name: 'events' })
@Index('idx_events_title', ['title'])
@Index('idx_events_category_id', ['categoryId'])
@Index('idx_events_date_range', ['startDate', 'endDate'])
@Index('idx_events_status', ['status'])
@Index('idx_events_created_at', ['createdAt'])
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'title', type: 'varchar', length: 200, nullable: false })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'max_attendees', type: 'integer', nullable: true })
  maxAttendees?: number;

  @Column({ name: 'is_virtual', type: 'boolean', nullable: false, default: false })
  isVirtual: boolean = false;

  @Column({ name: 'location', type: 'varchar', length: 255, nullable: false })
  location: string;

  @Column({
    name: 'start_date',
    type: 'timestamp with time zone',
    nullable: false,
  })
  startDate: Date;

  @Column({
    name: 'end_date',
    type: 'timestamp with time zone',
    nullable: false,
  })
  endDate: Date;

  @Column({ name: 'status', type: 'varchar', length: 20, nullable: false })
  status: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: false })
  categoryId: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: false })
  createdBy: string;

  @ManyToOne('EventCategory', 'events', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id', referencedColumnName: 'id' })
  category: EventCategory;

  @OneToMany('Ticket', 'event')
  tickets?: Ticket[];

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt?: string;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt?: string;

  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at' })
  deletedAt?: Date;
}
