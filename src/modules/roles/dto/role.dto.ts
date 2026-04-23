import { Exclude, Expose, Type } from 'class-transformer';
import { PermissionsDto } from '~/modules/auth/dto/permission/get-permission.dto';
import { UserDto } from '~/modules/users/dto/user.dto';

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
