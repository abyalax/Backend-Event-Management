import { Exclude, Expose } from 'class-transformer';
import { UserDto } from '~/modules/users/dto/user.dto';
import type { Permission } from '../../entity/permission.entity';

@Exclude()
export class RoleDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  permissions: Permission[];

  @Exclude()
  users: UserDto[];
}
