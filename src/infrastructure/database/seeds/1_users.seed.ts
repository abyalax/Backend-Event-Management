import type { DataSource } from 'typeorm';
import type { Seeder } from 'typeorm-extension';

import { Permission } from '~/modules/auth/entities/permission.entity';
import { Role } from '~/modules/role-permissions/entities/role.entity';
import { RolePermission } from '~/modules/role-permissions/entities/role-permissions.entity';
import { User } from '~/modules/users/entities/user.entity';

import { mockPermissions } from '../mock/permission.mock';
import { mockRoles } from '../mock/role.mock';
import { mockRolePermissions } from '../mock/role-permission.mock';
import { mockUser } from '../mock/user.mock';

export default class UserSeeder implements Seeder {
  track = true;
  public async run(dataSource: DataSource): Promise<void> {
    const userRepo = dataSource.getRepository(User);
    const roleRepo = dataSource.getRepository(Role);
    const permRepo = dataSource.getRepository(Permission);
    const rolePermissionRepo = dataSource.getRepository(RolePermission);

    const { userRoles, users } = await mockUser();

    await userRepo.insert(users);
    console.log('✅ Seeded: users successfully');

    await roleRepo.insert(mockRoles);
    console.log('✅ Seeded: roles successfully');

    await permRepo.insert(mockPermissions);
    console.log('✅ Seeded: permissions successfully');

    const rolePermissionsData = mockRolePermissions.map((rp) => ({
      idRole: rp.id_role,
      idPermission: rp.id_permission,
    }));
    await rolePermissionRepo.insert(rolePermissionsData);

    console.log('✅ Seeded: role_permissions successfully');

    for (const { id_user, id_role } of userRoles) {
      await dataSource.query('INSERT INTO user_roles (id_user, id_role) VALUES ($1, $2)', [id_user, id_role]);
    }
    console.log('✅ Seeded: user_roles successfully');
  }
}
