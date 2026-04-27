import { Exclude, Expose, Type } from 'class-transformer';
import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

@Exclude()
export class XenditVirtualAccountWebhookDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  id: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  external_id: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  bank_code: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  account_number: string;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @Expose()
  @IsString()
  @IsNotEmpty()
  transaction_timestamp: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  merchant_code: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  payment_id: string;
}
