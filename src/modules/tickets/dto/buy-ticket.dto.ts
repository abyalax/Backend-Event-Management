import { Exclude, Expose, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { EwalletType, PaymentMethod } from '~/modules/payments/payment.enum';

@Exclude()
export class BuyTicketDto {
  @Expose()
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @Expose()
  @IsUUID()
  ticketId: string;

  @Expose()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

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
