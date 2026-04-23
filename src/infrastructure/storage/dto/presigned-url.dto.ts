import { Exclude, Expose } from 'class-transformer';
import { IsString, IsOptional, IsNumber } from 'class-validator';

@Exclude()
export class PresignedUrlDto {
  @Expose()
  @IsString()
  filename: string;

  @Expose()
  @IsString()
  mimeType: string;

  @Expose()
  @IsOptional()
  @IsNumber()
  size?: number;

  @Expose()
  @IsOptional()
  @IsString()
  bucket?: string;
}
