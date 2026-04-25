import { Exclude, Expose, Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { MetaRequestDto } from '~/common/dto/meta-request.dto';

@Exclude()
export class QueryEventDto extends MetaRequestDto {
  @Expose()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  min_price?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  max_price?: number;

  @Expose()
  @IsOptional()
  @IsString()
  status?: string;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  category?: number;
}
