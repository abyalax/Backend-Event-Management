import z from 'zod';

export type SortOrder = 'ASC' | 'DESC';

interface Pagination {
  page?: number;
  per_page?: number;
}
interface Sorting<E> {
  sort_by: keyof E | undefined;
  sort_order?: SortOrder;
}
interface GlobalFilter {
  search?: string;
}

export interface MetaRequest<E> extends Pagination, Sorting<E>, GlobalFilter {}

export declare class Paginated<T> {
  data: T[];
  meta: {
    itemsPerPage: number;
    totalItems?: number;
    currentPage?: number;
    totalPages?: number;
    sortBy: [string, SortOrder][];
    searchBy: string[];
    search: string;
    select: string[];
    filter?: {
      [column: string]: string | string[];
    };
    cursor?: string;
  };
  links: {
    first?: string;
    previous?: string;
    current: string;
    next?: string;
    last?: string;
  };
}

export const MetaResponseSchema = z.object({
  currentPage: z.number(),
  itemsPerPage: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
  sortBy: z.array(z.array(z.string())),
});
