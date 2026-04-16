import { FilterOperator, PaginateConfig } from 'nestjs-paginate';
import { User } from './entity/user.entity';

export const USER_PAGINATION_CONFIG: PaginateConfig<User> = {
  sortableColumns: ['id', 'name', 'email', 'createdAt', 'updatedAt'],
  searchableColumns: ['name', 'email'],
  filterableColumns: {
    name: [FilterOperator.ILIKE, FilterOperator.EQ],
    email: [FilterOperator.ILIKE, FilterOperator.EQ],
  },
  defaultSortBy: [['createdAt', 'DESC']],
  defaultLimit: 15,
  maxLimit: 100,
  relations: ['roles', 'roles.permissions'],
  multiWordSearch: true,
};
