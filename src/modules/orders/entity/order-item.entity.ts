import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import type { Ticket } from '~/modules/tickets/entity/ticket.entity';
import type { GeneratedEventTicket } from '~/modules/tickets/entity/generated-event-ticket.entity';
import type { Order } from './order.entity';

@Entity({ name: 'order_items' })
@Index('idx_order_items_order_id', ['orderId'])
@Index('idx_order_items_ticket_id', ['ticketId'])
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: false })
  orderId: string;

  @Column({ name: 'ticket_id', type: 'uuid', nullable: false })
  ticketId: string;

  @Column({ name: 'quantity', type: 'int', nullable: false })
  quantity: number;

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2, nullable: false })
  price: number;

  @Column({ name: 'subtotal', type: 'decimal', precision: 10, scale: 2, nullable: false })
  subtotal: number;

  @ManyToOne('Order', 'orderItems', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id', referencedColumnName: 'id' })
  order: Order;

  @ManyToOne('Ticket', 'orderItems', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id', referencedColumnName: 'id' })
  ticket: Ticket;

  @OneToMany('GeneratedEventTicket', 'orderItem')
  generatedTickets?: GeneratedEventTicket[];
}
