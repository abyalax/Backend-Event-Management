import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';

export enum BucketType {
  DOCUMENTS = 'documents',
  IMAGES = 'images',
  BACKUPS = 'backups',
  VIDEOS = 'videos',
}

/**
 * DTO for file upload response
 */
export class UploadResponseDto {
  success: boolean;

  data?: {
    filename: string;
    bucket: string;
    size: number;
    url: string;
    duration: number;
  };

  error?: string;
}

/**
 * DTO for file metadata response
 */
export class FileMetadataDto {
  bucket: string;
  filename: string;
  size: number;
  contentType: string;
  etag: string;
  uploadedAt: Date;
  lastModified: Date;
}

/**
 * DTO for file list response
 */
export class FileListResponseDto {
  success: boolean;

  data: {
    bucket: string;
    count: number;
    files: Array<{
      name: string;
      size: number;
      lastModified: Date;
    }>;
  };

  error?: string;
}

/**
 * DTO for presigned URL response
 */
export class PresignedUrlResponseDto {
  success: boolean;

  data: {
    url: string;
    expirySeconds: number;
  };

  error?: string;
}

/**
 * DTO for bucket statistics response
 */
export class BucketStatsResponseDto {
  success: boolean;

  data: {
    bucket: string;
    objectCount: number;
    totalSize: number;
    objects: Array<{
      name: string;
      size: number;
      lastModified: Date;
    }>;
  };

  error?: string;
}

/**
 * DTO for copy file request
 */
export class CopyFileDto {
  @IsString()
  @IsEnum(BucketType)
  source: string;

  @IsString()
  @MaxLength(255)
  sourceFile: string;

  @IsString()
  @IsEnum(BucketType)
  destination: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  destFile?: string;
}

/**
 * DTO for health check response
 */
export class HealthResponseDto {
  status: 'healthy' | 'unhealthy';

  timestamp: string;

  minio: {
    connected: boolean;
    endpoint: string;
    port: number;
    buckets: string[];
    latency: string;
  };

  metrics: {
    uploads: number;
    downloads: number;
    failedUploads: number;
    totalUploadedSize: string;
    successRate: string;
  };
}
