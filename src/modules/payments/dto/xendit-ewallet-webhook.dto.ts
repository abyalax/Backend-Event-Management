import { Exclude, Expose, Type } from 'class-transformer';
import { IsString, IsNumber, IsNotEmpty, IsOptional, IsBoolean, ValidateNested } from 'class-validator';

@Exclude()
export class XenditEwalletDataDto {
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
  @IsString()
  @IsNotEmpty()
  currency: string;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  charge_amount: number;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  capture_amount: number;

  @Expose()
  @IsString()
  @IsNotEmpty()
  checkout_method: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  channel_code: string;

  @Expose()
  @IsOptional()
  channel_properties?: Record<string, string>;

  @Expose()
  @IsOptional()
  actions?: Record<string, string>;

  @Expose()
  @Type(() => Boolean)
  @IsBoolean()
  @IsNotEmpty()
  is_redirect_customer: boolean;

  @Expose()
  @IsString()
  @IsOptional()
  failure_code?: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  created: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  updated: string;
}

@Exclude()
export class XenditEwalletWebhookDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  event: string;

  @Expose()
  @ValidateNested()
  @Type(() => XenditEwalletDataDto)
  data: XenditEwalletDataDto;
}
