import { Exclude, Expose } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

@Exclude()
export class CreateInvoiceDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  externalId: string;

  @Expose()
  @IsNumber()
  @IsPositive()
  amount: number;

  @Expose()
  @IsEmail()
  payerEmail: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  description: string;

  @Expose()
  @IsOptional()
  @IsString()
  currency?: string;

  @Expose()
  @IsOptional()
  @IsString()
  successRedirectUrl?: string;

  @Expose()
  @IsOptional()
  @IsString()
  failureRedirectUrl?: string;
}
