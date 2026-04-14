import { Exclude, Expose } from 'class-transformer';
import { IsEnum, IsNumber, IsNumberString, IsString } from 'class-validator';
import { EProductStatus } from '../product.schema';

@Exclude()
export class CreateProductDto {
  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsNumberString()
  price: string;

  @Expose()
  @IsEnum(EProductStatus)
  status: EProductStatus;

  @Expose()
  @IsString()
  category: string;

  @Expose()
  @IsNumber()
  stock: number;
}
