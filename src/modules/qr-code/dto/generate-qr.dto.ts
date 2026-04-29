import { Exclude, Expose } from 'class-transformer';
import { IsUUID } from 'class-validator';

@Exclude()
export class GenerateQrDto {
  @Expose()
  @IsUUID()
  ticketId: string;

  @Expose()
  @IsUUID()
  eventId: string;
}
