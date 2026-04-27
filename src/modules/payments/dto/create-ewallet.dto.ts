import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { EwalletType } from '../payment.enum';

export class CreateEwalletDto {
  @IsString()
  @IsNotEmpty()
  referenceId: string;

  @IsEnum(EwalletType)
  channelCode: EwalletType;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsOptional()
  channelProperties?: {
    successReturnUrl?: string;
    failureReturnUrl?: string;
    cancelReturnUrl?: string;
    mobileNumber?: string;
    cashtag?: string;
  };
}
