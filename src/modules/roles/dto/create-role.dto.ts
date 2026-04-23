import { Exclude, Expose, Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { PermissionsDto } from '~/modules/auth/dto/permission/get-permission.dto';

@Exclude()
export class CreateRoleDto {
  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionsDto)
  permissions: PermissionsDto[];
}
