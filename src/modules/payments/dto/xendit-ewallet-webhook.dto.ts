import { Exclude, Expose, Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

@Exclude()
export class XenditEwalletWebhookDataDto {
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
  @IsOptional()
  is_redirect_required?: boolean;

  @Expose()
  @IsString()
  @IsOptional()
  failure_code?: string;

  @Expose()
  @IsString()
  @IsOptional()
  created?: string;

  @Expose()
  @IsString()
  @IsOptional()
  updated?: string;
}

@Exclude()
export class XenditEwalletWebhookDto {
  @Expose()
  @IsString()
  @IsOptional()
  event?: string;

  @Expose()
  @ValidateNested()
  @Type(() => XenditEwalletWebhookDataDto)
  data: XenditEwalletWebhookDataDto;
}
