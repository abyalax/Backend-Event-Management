import { Exclude, Expose, Type } from 'class-transformer';
import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

@Exclude()
export class XenditQrisWebhookDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  id: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  reference_id: string;

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
  @IsString()
  @IsOptional()
  qr_string?: string;

  @Expose()
  @IsString()
  @IsOptional()
  expires_at?: string;

  @Expose()
  @IsOptional()
  payment_details?: {
    receipt_id: string;
    source: string;
  };
}
