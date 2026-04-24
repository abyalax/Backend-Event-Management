import { FilterOperator, PaginateConfig } from 'nestjs-paginate';
import { Role } from './entity/role.entity';

export const ROLE_PAGINATION_CONFIG: PaginateConfig<Role> = {
  sortableColumns: ['id', 'name', 'createdAt', 'updatedAt'],
  searchableColumns: ['id', 'name'],
  filterableColumns: {
    name: [FilterOperator.ILIKE, FilterOperator.EQ],
  },
  defaultSortBy: [['createdAt', 'DESC']],
  defaultLimit: 15,
  maxLimit: 100,
  relations: ['rolePermissions', 'rolePermissions.permission'],
  multiWordSearch: true,
};
