import { Exclude, Expose, Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { MetaRequestDto } from '~/common/dto/meta-request.dto';
import { EEventStatus } from '../entity/event.entity';

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
  @IsEnum(EEventStatus)
  status?: EEventStatus;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  category?: number;
}
