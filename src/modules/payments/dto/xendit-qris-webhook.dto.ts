import { Exclude, Expose, Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

@Exclude()
export class XenditQrisWebhookDataDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  id: string;

  @Expose()
  @IsString()
  @IsOptional()
  qr_id?: string;

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
  @IsString()
  @IsOptional()
  created?: string;

  @Expose()
  @IsString()
  @IsOptional()
  channel_code?: string;

  @Expose()
  @IsOptional()
  payment_detail?: {
    receipt_id?: string;
    source?: string;
  };
}

@Exclude()
export class XenditQrisWebhookDto {
  @Expose()
  @IsString()
  @IsOptional()
  event?: string;

  @Expose()
  @ValidateNested()
  @Type(() => XenditQrisWebhookDataDto)
  data: XenditQrisWebhookDataDto;
}
