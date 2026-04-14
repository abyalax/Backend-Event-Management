import z from 'zod';
import { stringNumber } from '~/common/schema';
import { Product } from './entity/product.entity';

export enum EProductStatus {
  AVAILABLE = 'Available',
  UNAVAILABLE = 'UnAvailable',
}

export enum ESortBy {
  NAME = 'name',
  PRICE = 'price',
  STATUS = 'status',
  CATEGORY = 'category',
  STOCK = 'stock',
}

export const CategorySchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  products: z.array(z.any()).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const ProductSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  price: z.string(),
  status: z.enum([EProductStatus.AVAILABLE, EProductStatus.UNAVAILABLE]),
  category_id: z.coerce.number(),
  category: CategorySchema,
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const ProductTrendingSchema = z.object({
  name: z.string(),
  periode: z.coerce.number(),
  id: z.coerce.number(),
  total_qty: z.coerce.number(),
});

export type ProductTrending = z.infer<typeof ProductTrendingSchema>;

export type ProductTrendPeriode = 'week' | 'month';

export const productFrequencySoldSchema = z.object({
  name: z.string(),
  category: z.string(),
  total_product: stringNumber('Total product must be a valid number'),
});

export type ProductFrequencySold = z.infer<typeof productFrequencySoldSchema>;

export const productDiscountImpactSchema = z.object({
  name: z.string(),
  with_discount: stringNumber('With discount must be a valid number'),
  without_discount: stringNumber('With discount must be a valid number'),
});

export type ProductDiscountImpact = z.infer<typeof productDiscountImpactSchema>;

export type OmitProduct = Omit<Product, 'id' | 'category' | 'category_id' | 'stock' | 'created_at' | 'updated_at'> & {
  category: string;
};

/**
 * Helper untuk placeholder query cross DB
 */
export function getPlaceholder(dbType: string = 'mysql', index: number): string {
  return dbType === 'postgres' ? `$${index}` : `?`;
}

/**
 * Helper untuk fungsi date extract cross DB
 */
export function getDateExtract(dbType: string = 'mysql', unit: 'year' | 'month' | 'week', column = 't.created_at'): string {
  if (dbType === 'postgres') {
    if (unit === 'week') return `EXTRACT(WEEK FROM ${column})`; // week of year
    return `EXTRACT(${unit.toUpperCase()} FROM ${column})`;
  } else {
    if (unit === 'week') return `WEEK(${column}, 1)`; // mode 1: ISO week (start Monday)
    return `${unit.toUpperCase()}(${column})`;
  }
}
