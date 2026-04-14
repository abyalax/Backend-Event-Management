import { Exclude, Expose } from 'class-transformer';
import { IsString } from 'class-validator';

@Exclude()
export class CreateCategoryDto {
  @Expose()
  @IsString({ message: 'Category name must be a string' })
  name: string;
}
