import { Exclude, Expose, Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { MetaRequestDto } from '~/common/dto/meta-request.dto';
import { EProductStatus } from '../product.schema';

@Exclude()
export class QueryProductDto extends MetaRequestDto {
  @Expose()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  min_price?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  max_price?: number;

  @Expose()
  @IsOptional()
  @IsEnum(EProductStatus)
  status?: EProductStatus;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  category?: number;
}
