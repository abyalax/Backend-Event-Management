import { Exclude, Expose, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

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
}
