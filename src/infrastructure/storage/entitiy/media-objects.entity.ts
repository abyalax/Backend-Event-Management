import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { EAccessType } from '../dto/presigned-url.dto';

@Entity('media_objects')
export class MediaObject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  bucket: string;

  @Column()
  objectKey: string;

  @Column({ nullable: true })
  mimeType?: string;

  @Column({ nullable: true })
  size?: number;

  @Column({ nullable: true })
  originalName?: string;

  @Column({ nullable: true })
  uploadedBy?: string;

  @Column({ type: 'enum', enum: EAccessType, default: EAccessType.PRIVATE })
  accessType: EAccessType = EAccessType.PRIVATE;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt?: string;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt?: string;

  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at' })
  deletedAt?: Date;
}
