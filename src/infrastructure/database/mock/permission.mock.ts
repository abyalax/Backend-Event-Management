import { Permission } from '~/modules/auth/entity/permission.entity';

export const mockPermissions: Permission[] = [
  { id: 1, key: 'product:create', name: 'Create Product', roles: [] },
  { id: 2, key: 'product:read', name: 'Read Product', roles: [] },
  { id: 3, key: 'product:update', name: 'Update Product', roles: [] },
  { id: 4, key: 'product:delete', name: 'Delete Product', roles: [] },
];
