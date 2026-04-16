import type { DataSource } from 'typeorm';
import type { Seeder } from 'typeorm-extension';

import { Permission } from '~/modules/auth/entity/permission.entity';
import { Role } from '~/modules/auth/entity/role.entity';
import { User } from '~/modules/user/entity/user.entity';

import { mockPermissions } from '../mock/permission.mock';
import { mockRoles } from '../mock/role.mock';
import { mockRolePermissions } from '../mock/role-permission.mock';
import { mockUser } from '../mock/user.mock';
import { mockUserRoles } from '../mock/user-role.mock';

export default class UserSeeder implements Seeder {
  track = true;
  public async run(dataSource: DataSource): Promise<void> {
    const userRepo = dataSource.getRepository(User);
    const roleRepo = dataSource.getRepository(Role);
    const permRepo = dataSource.getRepository(Permission);

    const dataUser = await mockUser();

    await userRepo.insert(dataUser);
    console.log('✅ Seeded: users successfully');

    await roleRepo.insert(mockRoles);
    console.log('✅ Seeded: roles successfully');

    await permRepo.insert(mockPermissions);
    console.log('✅ Seeded: permissions successfully');

    for (const { id_role, id_permission } of mockRolePermissions) {
      await dataSource.query('INSERT INTO role_permissions (id_role, id_permission) VALUES ($1, $2)', [id_role, id_permission]);
    }

    console.log('✅ Seeded: role_permissions successfully');

    for (const { id_user, id_role } of mockUserRoles) {
      await dataSource.query('INSERT INTO user_roles (id_user, id_role) VALUES ($1, $2)', [id_user, id_role]);
    }
    console.log('✅ Seeded: user_roles successfully');
  }
}
