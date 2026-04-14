import { Exclude, Expose, Type } from 'class-transformer';
import { IsOptional, IsNumber, IsDateString } from 'class-validator';

@Exclude()
export class FilterPeriodeDto {
  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  year?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  month?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  week?: number;

  @Expose()
  @IsOptional()
  @IsDateString()
  start?: string;

  @Expose()
  @IsOptional()
  @IsDateString()
  end?: string;
}
