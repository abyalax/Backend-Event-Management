import { Inject, Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { MinioProvider } from './providers/minio.provider';
import { RetryStrategy } from './strategies/retry.strategy';
import { PinoLogger } from 'nestjs-pino';
import { CONFIG_PROVIDER } from '~/common/constants/provider';

export interface StorageConfig {
  buckets: {
    [key: string]: string;
  };
  maxFileSize: number;
  allowedMimeTypes?: string[];
}

export interface UploadFileParams {
  bucket: string;
  file: Buffer;
  metadata: {
    originalname: string;
    mimetype: string;
  };
}

export interface UploadStreamParams {
  bucket: string;
  filename: string;
  stream: Readable;
  size: number;
  contentType: string;
}

export interface FileMetadata {
  bucket: string;
  filename: string;
  size: number;
  contentType: string;
  etag: string;
  uploadedAt: Date;
  lastModified: Date;
}

export interface FileOperationResult {
  success: boolean;
  filename: string;
  bucket: string;
  size?: number;
  url?: string;
  error?: string;
  duration: number;
}

export interface BucketStatistics {
  bucket: string;
  objectCount: number;
  totalSize: number;
  objects: Array<{
    name: string;
    size: number;
    lastModified: Date;
  }>;
}

/**
 * Storage Service - Business logic for MinIO operations
 *
 * serve:
 * - File upload/download dengan validation
 * - Bucket management
 * - File metadata operations
 * - Presigned URLs
 * - Retry logic
 * - Error handling
 *
 * Architecture:
 * 1. Validate request (MIME type, file size)
 * 2. Generate unique filename
 * 3. Execute operation with retry mechannism
 * 4. Log and return result
 */
@Injectable()
export class StorageService {
  private readonly metrics = {
    uploadCount: 0,
    uploadFailedCount: 0,
    downloadCount: 0,
    downloadFailedCount: 0,
    totalUploadedSize: 0,
  };

  constructor(
    private readonly minioProvider: MinioProvider,
    private readonly retryStrategy: RetryStrategy,
    private readonly logger: PinoLogger,

    @Inject(CONFIG_PROVIDER.STORAGE)
    private readonly config: StorageConfig,
  ) {
    this.logger.setContext(StorageService.name);
    this.logger.info('StorageService initialized');
  }

  async uploadFile(params: UploadFileParams): Promise<FileOperationResult> {
    const startTime = Date.now();
    const uniqueFilename = this.generateUniqueFilename(params.metadata.originalname);

    try {
      // Validate bucket exists
      this.validateBucket(params.bucket);

      // Validate file
      this.validateFile(params.file, params.metadata.mimetype);

      // Get client
      const client = await this.minioProvider.getClient();

      // Execute upload dengan retry
      const result = await this.retryStrategy.execute(async () => {
        return await client.putObject(params.bucket, uniqueFilename, params.file, params.file.length, {
          'Content-Type': params.metadata.mimetype,
          'X-Original-Filename': this.encodeMetadata(params.metadata.originalname),
          'X-Upload-Time': new Date().toISOString(),
        });
      }, `Upload ${uniqueFilename} to ${params.bucket}`);

      if (!result.success) {
        this.metrics.uploadFailedCount++;
        throw new InternalServerErrorException(`Upload failed after ${result.attempts} attempts: ${result.error?.message}`);
      }

      const duration = Date.now() - startTime;
      this.metrics.uploadCount++;
      this.metrics.totalUploadedSize += params.file.length;

      this.logger.info(`File uploaded successfully`, {
        bucket: params.bucket,
        filename: uniqueFilename,
        size: params.file.length,
        duration,
        attempts: result.attempts,
      });

      return {
        success: true,
        filename: uniqueFilename,
        bucket: params.bucket,
        size: params.file.length,
        url: `/${params.bucket}/${uniqueFilename}`,
        duration,
      };
    } catch (error) {
      this.metrics.uploadFailedCount++;
      const duration = Date.now() - startTime;

      this.logger.error('File upload failed', {
        bucket: params.bucket,
        originalFilename: params.metadata.originalname,
        error: (error as Error).message,
        duration,
      });

      return {
        success: false,
        filename: params.metadata.originalname,
        bucket: params.bucket,
        error: (error as Error).message,
        duration,
      };
    }
  }

  async uploadStream(params: UploadStreamParams): Promise<FileOperationResult> {
    const startTime = Date.now();
    const uniqueFilename = this.generateUniqueFilename(params.filename);

    try {
      this.validateBucket(params.bucket);
      const client = await this.minioProvider.getClient();

      const result = await this.retryStrategy.execute(async () => {
        return await client.putObject(params.bucket, uniqueFilename, params.stream, params.size, {
          'Content-Type': params.contentType,
          'X-Original-Filename': this.encodeMetadata(params.filename),
        });
      }, `Stream upload ${uniqueFilename}`);

      if (!result.success) {
        this.metrics.uploadFailedCount++;
        throw new InternalServerErrorException(result.error?.message);
      }

      const duration = Date.now() - startTime;
      this.metrics.uploadCount++;
      this.metrics.totalUploadedSize += params.size;

      return {
        success: true,
        filename: uniqueFilename,
        bucket: params.bucket,
        size: params.size,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.uploadFailedCount++;

      return {
        success: false,
        filename: params.filename,
        bucket: params.bucket,
        error: (error as Error).message,
        duration,
      };
    }
  }

  async downloadFile(bucket: string, filename: string): Promise<{ stream: Readable; metadata: unknown }> {
    try {
      this.validateBucket(bucket);
      const client = await this.minioProvider.getClient();

      const result = await this.retryStrategy.execute(async () => {
        const stream = await client.getObject(bucket, filename);
        return stream;
      }, `Download ${filename} from ${bucket}`);

      if (!result.success) {
        throw new NotFoundException(`File not found: ${filename}`);
      }

      this.metrics.downloadCount++;

      // Get file metadata
      let metadata: unknown;
      try {
        metadata = await client.statObject(bucket, filename);
      } catch (error) {
        const lastError = error as Error;
        this.logger.warn(lastError ?? 'Failed to get file metadata');
      }

      this.logger.info(`File downloaded: ${filename}`, { bucket });

      return {
        stream: result.data as Readable,
        metadata,
      };
    } catch (error) {
      this.metrics.downloadFailedCount++;
      throw error;
    }
  }

  async getFileMetadata(bucket: string, filename: string): Promise<FileMetadata> {
    try {
      this.validateBucket(bucket);
      const client = await this.minioProvider.getClient();

      const result = await this.retryStrategy.execute(async () => {
        return await client.statObject(bucket, filename);
      }, `Get metadata ${filename}`);

      if (!result.success) throw new NotFoundException(`File not found: ${filename}`);

      const stat = result.data;
      if (!stat) {
        throw new NotFoundException(`File not found: ${filename}`);
      }
      return {
        bucket,
        filename,
        size: stat.size || 0,
        contentType: stat.metaData?.['content-type'] || 'application/octet-stream',
        etag: stat.etag || '',
        uploadedAt: new Date(),
        lastModified: stat.lastModified || new Date(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to get metadata: ${(error as Error).message}`);
    }
  }

  async deleteFile(bucket: string, filename: string): Promise<boolean> {
    try {
      this.validateBucket(bucket);
      const client = await this.minioProvider.getClient();

      const result = await this.retryStrategy.execute(async () => {
        await client.removeObject(bucket, filename);
        return true;
      }, `Delete ${filename}`);

      if (!result.success) {
        throw new InternalServerErrorException(result.error?.message);
      }

      this.logger.info(`File deleted: ${filename}`, { bucket });
      return true;
    } catch (error) {
      this.logger.error('File deletion failed', {
        bucket,
        filename,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async getPresignedUrl(bucket: string, filename: string, expirySeconds: number = 3600): Promise<string> {
    try {
      this.validateBucket(bucket);
      const client = await this.minioProvider.getClient();
      const url = await client.presignedGetObject(bucket, filename, expirySeconds);

      this.logger.info(`Presigned URL generated for ${filename}`);
      return url;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to generate presigned URL: ${(error as Error).message}`);
    }
  }

  async getPresignedPutUrl(bucket: string, filename: string, expirySeconds: number = 3600): Promise<string> {
    try {
      this.validateBucket(bucket);
      const client = await this.minioProvider.getClient();
      const url = await client.presignedPutObject(bucket, filename, expirySeconds);
      return url;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to generate presigned PUT URL: ${(error as Error).message}`);
    }
  }

  async listFiles(bucket: string, prefix: string = ''): Promise<Array<{ name: string; size: number; lastModified: Date }>> {
    try {
      this.validateBucket(bucket);
      const client = await this.minioProvider.getClient();
      const files: Array<{ name: string; size: number; lastModified: Date }> = [];

      return new Promise((resolve, reject) => {
        const stream = client.listObjects(bucket, prefix, true);

        stream.on('data', (obj: { name: string; size: number; lastModified: Date }) => {
          files.push({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
          });
        });

        stream.on('error', (error: Error) => {
          this.logger.error('Failed to list files', error);
          reject(new InternalServerErrorException(error.message));
        });

        stream.on('end', () => {
          resolve(files);
        });
      });
    } catch (error) {
      throw new InternalServerErrorException(`Failed to list files: ${(error as Error).message}`);
    }
  }

  async getBucketStats(bucket: string): Promise<BucketStatistics> {
    try {
      const objects = await this.listFiles(bucket);

      const totalSize = objects.reduce((sum, obj) => sum + obj.size, 0);

      return {
        bucket,
        objectCount: objects.length,
        totalSize,
        objects,
      };
    } catch (error) {
      throw new InternalServerErrorException(`Failed to get bucket stats: ${(error as Error).message}`);
    }
  }

  async copyFile(sourceBucket: string, sourceFilename: string, destinationBucket: string, destinationFilename?: string): Promise<boolean> {
    try {
      this.validateBucket(sourceBucket);
      this.validateBucket(destinationBucket);

      const client = await this.minioProvider.getClient();
      const destFilename = destinationFilename || sourceFilename;

      const result = await this.retryStrategy.execute(async () => {
        await client.copyObject(destinationBucket, destFilename, `/${sourceBucket}/${sourceFilename}`);
        return true;
      }, `Copy ${sourceFilename} from ${sourceBucket} to ${destinationBucket}`);

      if (!result.success) {
        throw new InternalServerErrorException(result.error?.message);
      }

      this.logger.info('File copied successfully', {
        sourceBucket,
        sourceFilename,
        destinationBucket,
        destinationFilename: destFilename,
      });

      return true;
    } catch (error) {
      throw new InternalServerErrorException(`Copy failed: ${(error as Error).message}`);
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.uploadCount / (this.metrics.uploadCount + this.metrics.uploadFailedCount) || 0,
    };
  }

  private validateBucket(bucket: string): void {
    const validBuckets = Object.values(this.config.buckets);
    if (!validBuckets.includes(bucket)) throw new BadRequestException(`Invalid bucket: ${bucket}. Valid buckets: ${validBuckets.join(', ')}`);
  }

  private validateFile(file: Buffer, mimetype: string): void {
    // Check file size
    if (file.length > this.config.maxFileSize) {
      throw new BadRequestException(`File size exceeds limit: ${file.length} bytes > ${this.config.maxFileSize} bytes`);
    }

    // Check MIME type
    if (this.config.allowedMimeTypes && this.config.allowedMimeTypes.length > 0) {
      if (!this.config.allowedMimeTypes.includes(mimetype)) {
        throw new BadRequestException(`MIME type not allowed: ${mimetype}. Allowed: ${this.config.allowedMimeTypes.join(', ')}`);
      }
    }
  }

  private generateUniqueFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    const ext = this.getFileExtension(originalFilename);

    return `${timestamp}_${random}${ext}`;
  }

  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
  }

  private encodeMetadata(value: string): string {
    return Buffer.from(value).toString('base64');
  }

  private decodeMetadata(value: string): string {
    return Buffer.from(value, 'base64').toString('utf-8');
  }
}
