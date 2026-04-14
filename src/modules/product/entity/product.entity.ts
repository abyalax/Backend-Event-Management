import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { EProductStatus } from '../product.schema';
import type { Category } from './category.entity';

@Entity({ name: 'products' })
@Index('product_name', ['name'], { fulltext: true })
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price: string;

  @Column({ type: 'int' })
  stock: number;

  @Column({ type: 'enum', enum: EProductStatus })
  status: EProductStatus;

  @Column({ nullable: true })
  category_id: number;

  @ManyToOne('Category', 'products', { onDelete: 'RESTRICT', onUpdate: 'CASCADE', eager: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP(6)', nullable: false })
  created_at?: string;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at', default: () => 'CURRENT_TIMESTAMP(6)', nullable: false })
  updated_at?: string;
}
