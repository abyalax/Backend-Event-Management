import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateQrisDto {
  @IsString()
  @IsNotEmpty()
  referenceId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
