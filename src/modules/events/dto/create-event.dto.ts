import { Exclude, Expose, Transform } from 'class-transformer';
import { IsBoolean, IsDate, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

@Exclude()
export class CreateEventDto {
  @Expose()
  @IsString()
  @MaxLength(200)
  title: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string;

  @Expose()
  @IsOptional()
  @IsNumber()
  maxAttendees?: number;

  @Expose()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isVirtual: boolean = false;

  @Expose()
  @IsString()
  @MaxLength(255)
  location: string;

  @Expose()
  @IsDate()
  @Transform(({ value }: { value: string | Date }) => new Date(value))
  startDate: Date;

  @Expose()
  @IsDate()
  @Transform(({ value }: { value: string | Date }) => new Date(value))
  endDate: Date;

  @Expose()
  @IsString()
  @MaxLength(20)
  status: string;

  @Expose()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  categoryId: number;

  @Expose()
  @IsUUID()
  createdBy: string;
}
