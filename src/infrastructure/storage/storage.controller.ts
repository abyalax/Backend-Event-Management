import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { StorageService } from './storage.service';
import { MinioProvider } from './providers/minio.provider';
import { UploadResponseDto } from './dto/storage.dto';
import { TResponse } from '~/common/types/response';

/**
 * Storage Controller - REST API untuk file operations
 *
 * Endpoints:
 * POST   /api/storage/upload/:bucket
 * GET    /api/storage/download/:bucket/:filename
 * GET    /api/storage/metadata/:bucket/:filename
 * GET    /api/storage/presigned/:bucket/:filename
 * DELETE /api/storage/:bucket/:filename
 * GET    /api/storage/list/:bucket
 * GET    /api/storage/health
 *
 * Error handling:
 * - 400: Bad request (invalid file, bucket, etc)
 * - 404: File not found
 * - 500: Internal server error
 */
@Controller('api/storage')
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    private readonly minioProvider: MinioProvider,
  ) {}

  /**
   * Upload file
   *
   * @param bucket - Target bucket
   * @param file - File to upload
   * @returns Upload result dengan filename
   *
   * Example:
   * curl -X POST http://localhost:3000/api/storage/upload/documents \
   *   -F "file=@/path/to/file.pdf"
   */
  @Post('upload/:bucket')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@Param('bucket') bucket: string, @UploadedFile() file: Express.Multer.File): Promise<TResponse<UploadResponseDto>> {
    if (!file) throw new BadRequestException('No file provided');

    const result = await this.storageService.uploadFile({
      bucket,
      file: file.buffer,
      metadata: {
        originalname: file.originalname,
        mimetype: file.mimetype,
      },
    });

    if (!result.success) {
      return {
        message: 'Upload failed',
        error: result.error,
      };
    }

    return {
      message: 'Upload files successfully',
      data: {
        filename: result.filename || '',
        bucket: result.bucket || '',
        size: result.size || 0,
        url: result.url || '',
        duration: result.duration || 0,
      },
    };
  }

  /**
   * Download file
   *
   * @param bucket - Source bucket
   * @param filename - File to download
   * @returns File stream
   *
   * Example:
   * curl http://localhost:3000/api/storage/download/documents/filename.pdf \
   *   -o downloaded_file.pdf
   */
  @Get('download/:bucket/:filename')
  async downloadFile(@Param('bucket') bucket: string, @Param('filename') filename: string, @Res() res: Response) {
    try {
      const { stream, metadata } = await this.storageService.downloadFile(bucket, filename);

      const metadataObj = metadata as Record<string, unknown>;
      const contentType = (metadataObj.metaData as Record<string, string>)?.['content-type'] || 'application/octet-stream';
      const size = metadataObj.size as number;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      if (size) res.setHeader('Content-Length', size);

      // Pipe stream to response
      stream.pipe(res);
    } catch (error) {
      res.status(HttpStatus.NOT_FOUND).json({
        message: 'Download failed',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get file metadata
   *
   * @param bucket - Bucket name
   * @param filename - File name
   * @returns File metadata
   *
   * Example:
   * curl http://localhost:3000/api/storage/metadata/documents/filename.pdf
   */
  @Get('metadata/:bucket/:filename')
  async getFileMetadata(@Param('bucket') bucket: string, @Param('filename') filename: string) {
    try {
      const metadata = await this.storageService.getFileMetadata(bucket, filename);

      return {
        message: 'File metadata retrieved successfully',
        data: metadata,
      };
    } catch (error) {
      return {
        message: 'Failed to retrieve file metadata',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get presigned URL for download
   * Used for client-side operations or sharing
   *
   * @param bucket - Bucket name
   * @param filename - File name
   * @param expiry - Expiry time in seconds (default: 3600)
   * @returns Presigned URL
   *
   * Example:
   * curl "http://localhost:3000/api/storage/presigned/documents/filename.pdf?expiry=7200"
   */
  @Get('presigned/:bucket/:filename')
  async getPresignedUrl(@Param('bucket') bucket: string, @Param('filename') filename: string, @Query('expiry') expirySeconds: number = 3600) {
    try {
      const url = await this.storageService.getPresignedUrl(bucket, filename, expirySeconds);

      return {
        message: 'Presigned URL generated successfully',
        data: {
          url,
          expirySeconds,
        },
      };
    } catch (error) {
      return {
        message: 'Failed to generate presigned URL',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Delete file
   *
   * @param bucket - Bucket name
   * @param filename - File to delete
   *
   * Example:
   * curl -X DELETE http://localhost:3000/api/storage/documents/filename.pdf
   */
  @Delete(':bucket/:filename')
  @HttpCode(HttpStatus.OK)
  async deleteFile(@Param('bucket') bucket: string, @Param('filename') filename: string) {
    try {
      const success = await this.storageService.deleteFile(bucket, filename);

      return {
        message: `File deleted: ${filename}`,
        data: { success },
      };
    } catch (error) {
      return {
        message: 'Failed to delete file',
        error: (error as Error).message,
      };
    }
  }

  /**
   * List files in bucket
   *
   * @param bucket - Bucket name
   * @param prefix - Optional prefix filter
   * @returns List of files
   *
   * Example:
   * curl http://localhost:3000/api/storage/list/documents
   * curl "http://localhost:3000/api/storage/list/documents?prefix=2024"
   */
  @Get('list/:bucket')
  async listFiles(@Param('bucket') bucket: string, @Query('prefix') prefix: string = '') {
    try {
      const files = await this.storageService.listFiles(bucket, prefix);

      return {
        message: 'Files listed successfully',
        data: {
          bucket,
          count: files.length,
          files,
        },
      };
    } catch (error) {
      return {
        message: 'Failed to list files',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get bucket statistics
   *
   * @param bucket - Bucket name
   * @returns Bucket stats
   *
   * Example:
   * curl http://localhost:3000/api/storage/stats/documents
   */
  @Get('stats/:bucket')
  async getBucketStats(@Param('bucket') bucket: string) {
    try {
      const stats = await this.storageService.getBucketStats(bucket);

      return {
        message: 'Bucket statistics retrieved successfully',
        data: stats,
      };
    } catch (error) {
      return {
        message: 'Failed to retrieve bucket statistics',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Copy file antara buckets
   *
   * @param source - Source bucket
   * @param sourceFile - Source filename
   * @param destination - Destination bucket
   * @param destFile - Optional destination filename
   *
   * Example:
   * curl -X Post "http://localhost:3000/api/storage/copy?source=documents&sourceFile=file.pdf&destination=backups"
   */
  @Post('copy')
  async copyFile(
    @Query('source') source: string,
    @Query('sourceFile') sourceFile: string,
    @Query('destination') destination: string,
    @Query('destFile') destFile?: string,
  ) {
    if (!source || !sourceFile || !destination) throw new BadRequestException('Required parameters: source, sourceFile, destination');

    try {
      const success = await this.storageService.copyFile(source, sourceFile, destination, destFile);

      return {
        message: `File copied from ${source}/${sourceFile} to ${destination}/${destFile || sourceFile}`,
        data: { success },
      };
    } catch (error) {
      return {
        message: 'Failed to copy file',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Health check endpoint
   * Berguna untuk monitoring & load balancing
   *
   * Example:
   * curl http://localhost:3000/api/storage/health
   */
  @Get('health')
  async health() {
    const providerStatus = this.minioProvider.getStatus();
    const healthCheck = await this.minioProvider.healthCheck();
    const metrics = this.storageService.getMetrics();

    return {
      message: 'Health check completed',
      data: {
        status: healthCheck.status,
        timestamp: new Date().toISOString(),
        minio: {
          ...providerStatus,
          latency: `${healthCheck.latency}ms`,
        },
        metrics: {
          uploads: metrics.uploadCount,
          downloads: metrics.downloadCount,
          failedUploads: metrics.uploadFailedCount,
          totalUploadedSize: `${(metrics.totalUploadedSize / 1024 / 1024).toFixed(2)} MB`,
          successRate: `${(metrics.successRate * 100).toFixed(2)}%`,
        },
      },
    };
  }

  /**
   * Metrics endpoint - Get detailed metrics
   *
   * Example:
   * curl http://localhost:3000/api/storage/metrics
   */
  @Get('metrics')
  getMetrics() {
    const metrics = this.storageService.getMetrics();
    const status = this.minioProvider.getStatus();

    return {
      message: 'Metrics retrieved successfully',
      data: {
        timestamp: new Date().toISOString(),
        buckets: status.buckets,
        operations: metrics,
      },
    };
  }
}
