import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { IsDateString, IsOptional, IsObject, ValidateNested } from 'class-validator';

@Exclude()
export class DateRangeDto {
  @Expose()
  @IsOptional()
  @IsDateString()
  start?: string;

  @Expose()
  @IsOptional()
  @IsDateString()
  end?: string;
}

@Exclude()
export class QueryDashboardDto {
  @Expose()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @Expose()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @Expose()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @Expose()
  @IsOptional()
  @Transform(({ value }) => {
    // Handle case where a single date string is passed as 'date' parameter
    if (typeof value === 'string') return value;
    return undefined;
  })
  date?: string;
}
