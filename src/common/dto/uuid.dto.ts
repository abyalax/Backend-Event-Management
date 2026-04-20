import { Exclude, Expose } from 'class-transformer';
import { IsString, IsUUID } from 'class-validator';

@Exclude()
export class UUIDDto {
  @Expose()
  @IsString()
  @IsUUID()
  id: string;
}
