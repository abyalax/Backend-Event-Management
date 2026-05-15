import { Exclude, Expose, Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, ValidateNested, ArrayMinSize, Min } from 'class-validator';
import { EwalletType, PaymentMethod } from '~/modules/payments/payment.enum';

@Exclude()
export class CreateOrderItemDto {
  @Expose()
  @IsUUID()
  ticketId: string;

  @Expose()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

@Exclude()
export class CreateOrderDto {
  @Expose()
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @Expose()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  successRedirectUrl?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  failureRedirectUrl?: string;

  @Expose()
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @Expose()
  @IsOptional()
  @IsEnum(EwalletType)
  ewalletType?: EwalletType;
}
