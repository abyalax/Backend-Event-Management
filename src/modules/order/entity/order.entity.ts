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
import type { Payment } from '~/modules/payment/entity/payment.entity';
import type { User } from '~/modules/user/entity/user.entity';
import type { OrderItem } from './order-item.entity';

@Entity({ name: 'orders' })
@Index('idx_orders_user_id', ['userId'])
@Index('idx_orders_status', ['status'])
@Index('idx_orders_created_at', ['createdAt'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId: string;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  totalAmount: number;

  @Column({ name: 'status', type: 'varchar', length: 20, nullable: false })
  status: string;

  @Column({
    name: 'expired_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  expiredAt?: Date | null;

  @ManyToOne('User', 'orders', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: User;

  @OneToMany('OrderItem', 'order')
  orderItems?: OrderItem[];

  @OneToMany('Payment', 'order')
  payments?: Payment[];

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt?: string;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt?: string;

  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at' })
  deletedAt?: Date;
}
