import { Exclude, Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

@Exclude()
export class PermissionsDto {
  @Expose()
  @IsNumber()
  id: number;

  @Expose()
  @IsString()
  key: string;

  @Expose()
  @IsString()
  name: string;
}
