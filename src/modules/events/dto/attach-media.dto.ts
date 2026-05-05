import { IsUUID, IsString, IsNotEmpty } from 'class-validator';
import { EEventMediaType } from '../entities/event-media.entity';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class AttachMediaDto {
  @Expose()
  @IsUUID()
  @IsNotEmpty()
  mediaId: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  type: EEventMediaType;
}
