import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { MediaObject } from '~/infrastructure/storage/entitiy/media-objects.entity';

export enum EEventMediaType {
  BANNER = 'banner',
  POSTER = 'poster',
  GALLERY = 'gallery',
  THUMBNAIL = 'thumbnail',
}

@Entity('event_media')
@Index(['eventId', 'type'], { unique: true, where: "type = 'banner'" })
export class EventMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventId: string;

  @Column()
  mediaId: string;

  @Column({ default: 'banner' })
  type: EEventMediaType;

  @Column({ default: 0 })
  order: number;

  @ManyToOne('Event')
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @ManyToOne('MediaObject')
  @JoinColumn({ name: 'media_id' })
  media: MediaObject;
}
