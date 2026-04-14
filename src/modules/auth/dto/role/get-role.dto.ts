import { Exclude, Expose, Type } from 'class-transformer';
import { UserDto } from '~/modules/user/dto/user.dto';
import { PermissionsDto } from '../permission/get-permission.dto';

@Exclude()
export class RoleDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  @Type(() => PermissionsDto)
  permissions: PermissionsDto[];

  @Exclude()
  @Type(() => UserDto)
  users: UserDto[];
}
