import { Exclude, Expose, Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

@Exclude()
export class XenditInvoiceWebhookDto {
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
  status: string;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  paid_amount?: number;

  @Expose()
  @IsString()
  @IsOptional()
  paid_at?: string;

  @Expose()
  @IsString()
  @IsOptional()
  payment_method?: string;

  @Expose()
  @IsString()
  @IsOptional()
  payment_channel?: string;

  @Expose()
  @IsString()
  @IsOptional()
  payer_email?: string;

  @Expose()
  @IsString()
  @IsOptional()
  description?: string;
}
