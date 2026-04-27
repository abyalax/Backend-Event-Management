import { FilterOperator, PaginateConfig } from 'nestjs-paginate';
import { Order } from './entity/order.entity';

export const ORDER_PAGINATION_CONFIG: PaginateConfig<Order> = {
  sortableColumns: ['id', 'status', 'totalAmount', 'createdAt', 'updatedAt'],
  searchableColumns: ['id', 'status', 'totalAmount', 'createdAt', 'updatedAt'],
  filterableColumns: {
    status: [FilterOperator.EQ],
    userId: [FilterOperator.EQ],
  },
  defaultSortBy: [['createdAt', 'DESC']],
  defaultLimit: 10,
  maxLimit: 50,
  relations: ['orderItems', 'orderItems.ticket'],
  multiWordSearch: true,
};
