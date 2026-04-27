import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  externalId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEmail()
  payerEmail: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  successRedirectUrl?: string;

  @IsOptional()
  @IsString()
  failureRedirectUrl?: string;
}
