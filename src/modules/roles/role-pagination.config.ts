import { FilterOperator, PaginateConfig } from 'nestjs-paginate';
import { Role } from './entity/role.entity';

export const USER_PAGINATION_CONFIG: PaginateConfig<Role> = {
  sortableColumns: ['id', 'name', 'users.name', 'permissions.name', 'createdAt', 'updatedAt'],
  searchableColumns: ['name', 'id'],
  filterableColumns: {
    name: [FilterOperator.ILIKE, FilterOperator.EQ],
    users: [FilterOperator.ILIKE, FilterOperator.EQ],
    permissions: [FilterOperator.ILIKE, FilterOperator.EQ],
  },
  defaultSortBy: [['createdAt', 'DESC']],
  defaultLimit: 15,
  maxLimit: 100,
  relations: ['permissions', 'users'],
  multiWordSearch: true,
};
