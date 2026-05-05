import { Expose } from 'class-transformer';
import { IsString, IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ReminderType } from '../entities/event-reminder.entity';

export class CreateReminderDto {
  @Expose()
  @IsUUID()
  eventId: string;

  @Expose()
  @IsUUID()
  orderId: string;

  @Expose()
  @IsDateString()
  scheduledAt: string;

  @Expose()
  @IsEnum(ReminderType)
  type: ReminderType;

  @Expose()
  @IsString()
  @IsOptional()
  subject?: string;

  @Expose()
  @IsString()
  @IsOptional()
  message?: string;
}
