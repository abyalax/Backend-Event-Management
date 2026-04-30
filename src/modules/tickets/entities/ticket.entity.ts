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
import type { Event } from '~/modules/events/entity/event.entity';
import type { OrderItem } from '~/modules/orders/entity/order-item.entity';
import type { GeneratedEventTicket } from './generated-event-ticket.entity';

@Entity({ name: 'tickets' })
@Index('idx_tickets_event_id', ['eventId'])
@Index('idx_tickets_name', ['name'])
@Index('idx_tickets_created_at', ['createdAt'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid', nullable: false })
  eventId: string;

  @Column({ name: 'name', type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2, nullable: false })
  price: number;

  @Column({ name: 'quota', type: 'int', nullable: false })
  quota: number;

  @Column({ name: 'sold', type: 'int', nullable: false, default: 0 })
  sold: number;

  @Column({ name: 'pdf_url', type: 'varchar', nullable: true })
  pdfUrl?: string;

  @Column({ name: 'is_used', type: 'boolean', nullable: false, default: false })
  isUsed: boolean;

  @ManyToOne('Event', 'tickets', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id', referencedColumnName: 'id' })
  event: Event;

  @OneToMany('OrderItem', 'ticket')
  orderItems?: OrderItem[];

  @OneToMany('GeneratedEventTicket', 'ticket')
  generatedTickets?: GeneratedEventTicket[];

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt?: string;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt?: string;

  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at' })
  deletedAt?: Date;
}
