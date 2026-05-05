import { EEventMediaType } from './entities/event-media.entity';

export interface AttachMediaRequest {
  mediaId: string;
  type: EEventMediaType;
}
