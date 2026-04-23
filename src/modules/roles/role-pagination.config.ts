import { FilterOperator, PaginateConfig } from 'nestjs-paginate';
import { Role } from './entity/role.entity';

export const ROLE_PAGINATION_CONFIG: PaginateConfig<Role> = {
  sortableColumns: ['id', 'name', 'users.name', 'users.email', 'rolePermissions.permission.name', 'createdAt', 'updatedAt'],
  searchableColumns: ['name', 'id'],
  filterableColumns: {
    name: [FilterOperator.ILIKE, FilterOperator.EQ],
    users: [FilterOperator.ILIKE, FilterOperator.EQ],
    rolePermissions: [FilterOperator.ILIKE, FilterOperator.EQ],
  },
  defaultSortBy: [['createdAt', 'DESC']],
  defaultLimit: 15,
  maxLimit: 100,
  relations: ['rolePermissions', 'rolePermissions.permission', 'users'],
  multiWordSearch: true,
};
