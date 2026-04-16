import z from 'zod';

export enum EEventStatus {
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
  Events: z.array(z.any()).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const EventSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  price: z.string(),
  status: z.enum([EEventStatus.AVAILABLE, EEventStatus.UNAVAILABLE]),
  category_id: z.coerce.number(),
  category: CategorySchema,
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type OmitEvent = Omit<Event, 'id' | 'category' | 'category_id' | 'stock' | 'created_at' | 'updated_at'> & {
  category: string;
};
