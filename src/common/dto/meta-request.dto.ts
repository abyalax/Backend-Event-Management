import { Exclude, Expose, Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

@Exclude()
export class MetaRequestDto {
  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  public page?: number;

  @Expose()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  public limit?: number;

  @Expose()
  @IsOptional()
  @IsString()
  public sort_by?: string;

  @Expose()
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  public sort_order?: 'ASC' | 'DESC';

  @Expose()
  @IsOptional()
  @IsString()
  public search?: string;
}
