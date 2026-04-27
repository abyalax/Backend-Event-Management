import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PaymentMethod, PaymentStatus } from '../payment.enum';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  externalId: string;

  @Index()
  @Column({ nullable: true })
  xenditId: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ default: 'IDR' })
  currency: string;

  @Column({ nullable: true })
  payerEmail: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  paymentUrl: string;

  @Column({ nullable: true })
  paidAt: Date;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ type: 'jsonb', nullable: true })
  xenditResponse: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
