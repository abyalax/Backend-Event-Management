import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Event } from '~/modules/events/entity/event.entity';

@Entity({ name: 'event_categories' })
@Index('idx_event_categories_name', ['name'])
@Index('idx_event_categories_created_at', ['createdAt'])
export class EventCategory {
  @PrimaryGeneratedColumn({ name: 'id_category' })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;

  @OneToMany('Event', 'category')
  events?: Event[];

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt?: string;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt?: string;

  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at' })
  deletedAt?: Date;
}
