import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { CONFIG_SERVICE, ConfigService, ConfigProvider } from '~/infrastructure/config/config.provider';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { PinoLogger } from 'nestjs-pino';
import { StorageController } from './storage.controller';
import { MediaController } from './media/media.controller';
import { StorageService } from './storage.service';
import { UrlGenerationService } from './url-generation.service';
import { MediaRepository } from './media/media.repository';
import { MinioProvider } from './providers/minio.provider';
import { RetryStrategy } from './strategies/retry.strategy';
import { StorageHealthIndicator } from './indicators/health.indicator';
import { FileValidationMiddleware } from './middleware/file-validation.middleware';
import { CONFIG_PROVIDER } from '~/common/constants/provider';

/**
 * Isolated Storage Module untuk MinIO integration
 *
 * Menyediakan:
 * - File upload/download operations
 * - Bucket management
 * - Health checks & monitoring
 * - Retry logic dengan exponential backoff
 *
 * Usage:
 * @Module({
 *   imports: [StorageModule]
 * })
 * export class AppModule {}
 *
 * Atau dengan custom config:
 * StorageModule.forRoot({ endpoint: 'minio.example.com' })
 */
@Module({
  imports: [TerminusModule, DatabaseModule],
  controllers: [StorageController, MediaController],
  providers: [
    ConfigProvider,
    PinoLogger,
    MinioProvider,
    StorageService,
    UrlGenerationService,
    MediaRepository,
    RetryStrategy,
    StorageHealthIndicator,
    FileValidationMiddleware,
    {
      inject: [CONFIG_SERVICE],
      provide: CONFIG_PROVIDER.STORAGE,
      useFactory: (configService: ConfigService) => ({
        endpoint: configService.get('MINIO_ENDPOINT'),
        port: configService.get('MINIO_PORT'),
        useSSL: configService.get('MINIO_USE_SSL'),
        accessKey: configService.get('MINIO_ACCESS_KEY'),
        secretKey: configService.get('MINIO_SECRET_KEY'),
        region: configService.get('MINIO_REGION'),
        buckets: {
          documents: configService.get('STORAGE_BUCKET_DOCUMENTS'),
          images: configService.get('STORAGE_BUCKET_IMAGES'),
          backups: configService.get('STORAGE_BUCKET_BACKUPS'),
          videos: configService.get('STORAGE_BUCKET_VIDEOS'),
          'images-public': configService.get('STORAGE_BUCKET_IMAGES_PUBLIC'),
          'tickets-public': configService.get('STORAGE_BUCKET_TICKETS_PUBLIC'),
        },
        maxFileSize: configService.get('MAX_FILE_SIZE'),
        allowedMimeTypes: configService.get('ALLOWED_MIME_TYPES')?.split(',') ?? [],
        retry: {
          maxAttempts: configService.get('RETRY_MAX_ATTEMPTS'),
          initialDelayMs: configService.get('RETRY_INITIAL_DELAY_MS'),
          maxDelayMs: configService.get('RETRY_MAX_DELAY_MS'),
        },
        monitoring: {
          enabled: configService.get('ENABLE_STORAGE_METRICS'),
          healthCheckInterval: configService.get('STORAGE_HEALTH_CHECK_INTERVAL'),
        },
      }),
    },
  ],
  exports: [StorageService, MinioProvider, StorageHealthIndicator, UrlGenerationService],
})
export class StorageModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(FileValidationMiddleware).forRoutes('media/upload');
  }

  /**
   * For use case with custom configuration
   * For Example:
   * StorageModule.forRoot({
   *   endpoint: 'custom-minio.example.com',
   *   port: 9000,
   *   useSSL: true
   * })
   */
  static forRoot(options: Record<string, unknown>) {
    return {
      module: StorageModule,
      controllers: [StorageController, MediaController],
      providers: [
        MinioProvider,
        StorageService,
        UrlGenerationService,
        RetryStrategy,
        StorageHealthIndicator,
        FileValidationMiddleware,
        {
          provide: CONFIG_PROVIDER.STORAGE,
          useValue: { ...options },
        },
      ],
      exports: [StorageService, MinioProvider, StorageHealthIndicator, UrlGenerationService],
    };
  }
}
