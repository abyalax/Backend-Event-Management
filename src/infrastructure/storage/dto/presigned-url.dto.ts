import { Exclude, Expose } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export enum EAccessType {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

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

  @Expose()
  @IsOptional()
  @IsEnum(EAccessType)
  accessType?: EAccessType = EAccessType.PRIVATE;
}
