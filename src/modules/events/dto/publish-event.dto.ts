import { Exclude, Expose } from 'class-transformer';
import { IsArray, IsUUID } from 'class-validator';

@Exclude()
export class PublishEventDto {
  @Expose()
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}
