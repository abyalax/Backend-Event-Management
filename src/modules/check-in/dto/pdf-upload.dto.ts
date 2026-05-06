import { Exclude, Expose } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

@Exclude()
export class PdfUploadDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  ticketId: string;
}
