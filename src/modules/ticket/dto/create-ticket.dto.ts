import { Exclude, Expose, Transform } from 'class-transformer';
import { IsDefined, IsNumber, IsString, IsUUID, MaxLength } from 'class-validator';

@Exclude()
export class CreateTicketDto {
  @Expose()
  @IsDefined()
  @IsString()
  @MaxLength(100)
  name: string;

  @Expose()
  @IsDefined()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  price: number;

  @Expose()
  @IsDefined()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  quota: number;

  @Expose()
  @IsDefined()
  @IsUUID()
  eventId: string;
}
