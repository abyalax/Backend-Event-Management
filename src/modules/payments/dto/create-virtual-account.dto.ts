import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { VirtualAccountBank } from '../payment.enum';

export class CreateVirtualAccountDto {
  @IsString()
  @IsNotEmpty()
  externalId: string;

  @IsEnum(VirtualAccountBank)
  bankCode: VirtualAccountBank;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsPositive()
  expectedAmount: number;

  @IsOptional()
  @IsString()
  description?: string;
}
