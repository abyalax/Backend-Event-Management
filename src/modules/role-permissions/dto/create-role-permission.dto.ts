import { Exclude, Expose } from 'class-transformer';
import { IsArray, IsString } from 'class-validator';

@Exclude()
export class CreateRoleDto {
  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsArray()
  permissionIds?: number[];
}
