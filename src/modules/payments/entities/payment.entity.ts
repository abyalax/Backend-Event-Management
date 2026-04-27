import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Order } from '~/modules/orders/entity/order.entity';

@Entity({ name: 'payments' })
@Index('idx_payments_order_id', ['orderId'])
@Index('idx_payments_external_id', ['externalId'], { unique: true })
@Index('idx_payments_status', ['status'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: false })
  orderId: string;

  @Column({ name: 'external_id', type: 'varchar', length: 100, nullable: false })
  externalId: string;

  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2, nullable: false })
  amount: number;

  @Column({ name: 'status', type: 'varchar', length: 20, nullable: false })
  status: string;

  @Column({ name: 'paid_at', type: 'timestamp with time zone', nullable: true })
  paidAt?: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @ManyToOne('Order', 'payments', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id', referencedColumnName: 'id' })
  order: Order;
}
