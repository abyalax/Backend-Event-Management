import { Exclude, Expose } from 'class-transformer';
import { IsDefined, IsOptional, IsString, MaxLength } from 'class-validator';

@Exclude()
export class CreateEventCategoryDto {
  @Expose()
  @IsDefined()
  @IsString()
  @MaxLength(100)
  name: string;

  @Expose()
  @IsDefined()
  @IsOptional()
  @IsString()
  description?: string;
}
