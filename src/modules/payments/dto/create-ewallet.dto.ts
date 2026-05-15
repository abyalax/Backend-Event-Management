import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { EwalletType } from '../payment.enum';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CreateEwalletDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  referenceId: string;

  @Expose()
  @IsEnum(EwalletType)
  channelCode: EwalletType;

  @Expose()
  @IsNumber()
  @IsPositive()
  amount: number;

  @Expose()
  @IsString()
  @IsNotEmpty()
  currency: string;

  @Expose()
  @IsOptional()
  channelProperties?: {
    successReturnUrl?: string;
    failureReturnUrl?: string;
    cancelReturnUrl?: string;
    pendingReturnUrl?: string;
    mobileNumber?: string;
    cashtag?: string;
  };
}
