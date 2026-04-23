import { EEventMediaType } from './entity/event-media.entity';

export interface AttachMediaRequest {
  mediaId: string;
  type: EEventMediaType;
}
