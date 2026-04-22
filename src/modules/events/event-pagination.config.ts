import { FilterOperator, PaginateConfig } from 'nestjs-paginate';
import { Event } from './entity/event.entity';

export const EVENT_PAGINATION_CONFIG: PaginateConfig<Event> = {
  sortableColumns: ['id', 'title', 'description', 'location', 'status', 'startDate', 'endDate'],
  searchableColumns: ['id', 'title', 'description', 'location', 'status', 'startDate', 'endDate', 'category.name', 'category.description'],
  filterableColumns: {
    title: [FilterOperator.ILIKE, FilterOperator.EQ],
    status: [FilterOperator.ILIKE, FilterOperator.EQ],
  },
  defaultSortBy: [['createdAt', 'DESC']],
  defaultLimit: 10,
  maxLimit: 100,
  relations: ['category'],
  multiWordSearch: true,
};
