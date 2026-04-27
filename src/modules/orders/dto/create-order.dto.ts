import { Exclude, Expose, Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, IsUUID, MaxLength, ValidateNested, ArrayMinSize, IsInt, Min } from 'class-validator';

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
}
