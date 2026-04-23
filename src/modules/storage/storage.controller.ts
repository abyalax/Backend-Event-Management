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
  async uploadFile(@Param('bucket') bucket: string, @UploadedFile() file: Express.Multer.File): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.storageService.uploadFile(bucket, file.buffer, {
      originalname: file.originalname,
      mimetype: file.mimetype,
    });

    return {
      success: result.success,
      data:
        result.success && result.size && result.url
          ? {
              filename: result.filename,
              bucket: result.bucket,
              size: result.size,
              url: result.url,
              duration: result.duration,
            }
          : undefined,
      error: result.error,
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

      // Set response headers
      res.setHeader('Content-Type', metadata?.metaData?.['content-type'] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      if (metadata?.size) {
        res.setHeader('Content-Length', metadata.size);
      }

      // Pipe stream to response
      stream.pipe(res);
    } catch (error) {
      res.status(HttpStatus.NOT_FOUND).json({
        success: false,
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
        success: true,
        data: metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get presigned URL untuk download
   * Berguna untuk client-side operations atau sharing
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
        success: true,
        data: {
          url,
          expirySeconds,
        },
      };
    } catch (error) {
      return {
        success: false,
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
        success,
        message: `File deleted: ${filename}`,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * List files dalam bucket
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
        success: true,
        data: {
          bucket,
          count: files.length,
          files,
        },
      };
    } catch (error) {
      return {
        success: false,
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
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
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
    if (!source || !sourceFile || !destination) {
      throw new BadRequestException('Required parameters: source, sourceFile, destination');
    }

    try {
      const success = await this.storageService.copyFile(source, sourceFile, destination, destFile);

      return {
        success,
        message: `File copied from ${source}/${sourceFile} to ${destination}/${destFile || sourceFile}`,
      };
    } catch (error) {
      return {
        success: false,
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
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        buckets: status.buckets,
        operations: metrics,
      },
    };
  }
}
