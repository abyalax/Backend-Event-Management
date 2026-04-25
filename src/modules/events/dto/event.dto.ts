import { Exclude, Expose } from 'class-transformer';
import { EventCategoryDto } from '~/modules/event-categories/dto/event-category.dto';

@Exclude()
export class EventDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  description?: string;

  @Expose()
  maxAttendees?: number;

  @Expose()
  isVirtual: boolean;

  @Expose()
  location: string;

  @Expose()
  startDate: Date;

  @Expose()
  endDate: Date;

  @Expose()
  status: string;

  @Expose()
  category: EventCategoryDto;

  @Expose()
  createdBy: string;

  @Expose()
  bannerUrl: string;
}
