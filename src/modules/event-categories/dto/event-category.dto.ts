import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class EventCategoryDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  description: string;

  @Exclude()
  createdAt: string;

  @Exclude()
  updatedAt: string;

  @Exclude()
  deletedAt: string;
}
