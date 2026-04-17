import { FilterOperator, PaginateConfig } from 'nestjs-paginate';
import { EventCategory } from './entity/event-category.entity';

export const EVENT_CATEGORY_PAGINATION_CONFIG: PaginateConfig<EventCategory> = {
  sortableColumns: ['id', 'description', 'name'],
  searchableColumns: ['id', 'description', 'name'],
  filterableColumns: {
    name: [FilterOperator.ILIKE, FilterOperator.EQ],
    description: [FilterOperator.ILIKE, FilterOperator.EQ],
    events: [FilterOperator.EQ],
  },
  defaultSortBy: [['createdAt', 'DESC']],
  defaultLimit: 10,
  maxLimit: 100,
  relations: [],
  multiWordSearch: true,
};
