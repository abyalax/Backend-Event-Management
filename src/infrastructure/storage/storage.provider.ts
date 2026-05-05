import { Provider } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { ConfigProvider, CONFIG_SERVICE, ConfigService } from '../config/config.provider';
import { StorageHealthIndicator } from './indicators/health.indicator';
import { MediaRepository } from './media/media.repository';
import { FileValidationMiddleware } from './middleware/file-validation.middleware';
import { MinioProvider } from './providers/minio.provider';
import { StorageService } from './storage.service';
import { RetryStrategy } from './strategies/retry.strategy';
import { UrlGenerationService } from './url-generation.service';

export const storageProvider: Provider[] = [
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
];
