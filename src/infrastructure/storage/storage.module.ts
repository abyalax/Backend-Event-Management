import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { MinioProvider } from './providers/minio.provider';
import { RetryStrategy } from './strategies/retry.strategy';
import { StorageHealthIndicator } from './indicators/health.indicator';
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
  imports: [TerminusModule],
  controllers: [StorageController],
  providers: [
    MinioProvider,
    StorageService,
    RetryStrategy,
    StorageHealthIndicator,
    {
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
        },
        maxFileSize: configService.get('MAX_FILE_SIZE'),
        allowedMimeTypes: configService.get('ALLOWED_MIME_TYPES')?.split(',') || [],
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
      inject: [CONFIG_SERVICE],
    },
  ],
  exports: [StorageService, MinioProvider, StorageHealthIndicator],
})
export class StorageModule {
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
      controllers: [StorageController],
      providers: [
        MinioProvider,
        StorageService,
        RetryStrategy,
        StorageHealthIndicator,
        {
          provide: CONFIG_PROVIDER.STORAGE,
          useValue: { ...options },
        },
      ],
      exports: [StorageService, MinioProvider, StorageHealthIndicator],
    };
  }
}
