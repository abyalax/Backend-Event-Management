import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { OrderItem } from '~/modules/order/entity/order-item.entity';
import type { Ticket } from './ticket.entity';

@Entity({ name: 'generated_event_tickets' })
@Index('idx_generated_event_tickets_order_item_id', ['orderItemId'])
@Index('idx_generated_event_tickets_is_used', ['isUsed'])
export class GeneratedEventTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_item_id', type: 'uuid', nullable: false })
  orderItemId: string;

  @Column({ name: 'qr_code_url', type: 'varchar', length: 500, nullable: false })
  qrCodeUrl: string;

  @Column({ name: 'pdf_url', type: 'varchar', length: 500, nullable: false })
  pdfUrl: string;

  @Column({ name: 'is_used', type: 'boolean', nullable: false, default: false })
  isUsed: boolean;

  @Column({ name: 'issued_at', type: 'timestamp with time zone', nullable: false })
  issuedAt: Date;

  @ManyToOne('OrderItem', 'generatedTickets', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_item_id', referencedColumnName: 'id' })
  orderItem: OrderItem;

  @ManyToOne('Ticket', 'generatedTickets', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id', referencedColumnName: 'id' })
  ticket: Ticket;
}
