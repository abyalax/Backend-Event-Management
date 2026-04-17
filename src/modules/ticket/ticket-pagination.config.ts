import { FilterOperator, PaginateConfig } from 'nestjs-paginate';
import { Ticket } from './entity/ticket.entity';

export const TICKET_PAGINATION_CONFIG: PaginateConfig<Ticket> = {
  sortableColumns: ['id', 'name', 'price', 'quota', 'sold'],
  searchableColumns: ['id', 'name', 'event.title', 'event.status', 'price'],
  filterableColumns: {
    name: [FilterOperator.ILIKE, FilterOperator.EQ],
    price: [FilterOperator.EQ],
  },
  defaultSortBy: [['createdAt', 'DESC']],
  defaultLimit: 10,
  maxLimit: 100,
  relations: ['event'],
  multiWordSearch: true,
};
