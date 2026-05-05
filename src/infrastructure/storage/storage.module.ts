import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { StorageController } from './storage.controller';
import { MediaController } from './media/media.controller';
import { StorageService } from './storage.service';
import { UrlGenerationService } from './url-generation.service';
import { MinioProvider } from './providers/minio.provider';
import { RetryStrategy } from './strategies/retry.strategy';
import { StorageHealthIndicator } from './indicators/health.indicator';
import { FileValidationMiddleware } from './middleware/file-validation.middleware';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { storageProvider } from './storage.provider';

/**
 * Isolated Storage Module untuk MinIO integration
 *
 * Serve:
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
  providers: storageProvider,
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
