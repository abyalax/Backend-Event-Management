import { Role } from '~/modules/auth/entity/role.entity';

export const mockRoles: Role[] = [
  { id: 1, name: 'Admin', users: [], permissions: [] },
  { id: 2, name: 'Cashier', users: [], permissions: [] },
  { id: 3, name: 'Karyawan', users: [], permissions: [] },
];
