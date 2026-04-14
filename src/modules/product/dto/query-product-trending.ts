import { Expose } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { FilterPeriodeDto } from '~/common/dto/filter-periode.dto';
import { ProductTrendPeriode } from '../product.schema';

export class QueryProductTrendDto extends FilterPeriodeDto {
  @Expose()
  @IsOptional()
  @IsEnum(['week', 'month'])
  type_periode?: ProductTrendPeriode;
}
