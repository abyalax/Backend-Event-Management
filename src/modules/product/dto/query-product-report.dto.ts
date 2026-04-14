import { Expose } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { FilterPeriodeDto } from '~/common/dto/filter-periode.dto';
import { SortOrder } from '~/common/types/meta';

export class QueryProductReportDto extends FilterPeriodeDto {
  @Expose()
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sort_order?: SortOrder;
}
