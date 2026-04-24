import { Exclude, Expose, Type } from 'class-transformer';
import { TransformRelation } from '~/common/decorators/transform-relations.decorator';
import { RolePermission } from '../entity/role-permissions.entity';
import { UserDto } from '~/modules/users/dto/user.dto';
import { PermissionsDto } from './permission.dto';

@Exclude()
export class RoleDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  @TransformRelation('rolePermissions', (rp: RolePermission) => rp.permission)
  permissions: PermissionsDto[];

  @Exclude()
  @Type(() => UserDto)
  users: UserDto[];
}
