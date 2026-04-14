import z from 'zod';
import { stringNumber } from '../schema';

export type SortOrder = 'ASC' | 'DESC';

interface Pagination {
  page?: number;
  per_page?: number;
}
interface Sorting<E> {
  sort_by?: keyof E | undefined;
  sort_order?: SortOrder;
}
interface GlobalFilter {
  search?: string;
}

export interface MetaRequest<E> extends Pagination, Sorting<E>, GlobalFilter {}

export const MetaResponseSchema = z.object({
  page: stringNumber('page must be a valid number'),
  per_page: stringNumber('per_page must be a valid number'),
  total_count: stringNumber('total_count must be a valid number'),
  total_pages: stringNumber('total_pages must be a valid number'),
});

export type MetaResponse = z.infer<typeof MetaResponseSchema>;

export interface Paginated<T = unknown> {
  data: T[];
  meta: MetaResponse;
}
