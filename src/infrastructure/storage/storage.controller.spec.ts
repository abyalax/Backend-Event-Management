import { MinioProvider } from './providers/minio.provider';
import { StorageController } from './storage.controller';
import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { RetryStrategy } from './strategies/retry.strategy';
import { StorageHealthIndicator } from './indicators/health.indicator';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { PinoLogger } from 'nestjs-pino';
import { HealthIndicatorService } from '@nestjs/terminus';

describe('StorageController', () => {
  let controller: StorageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      controllers: [StorageController],
      providers: [
        MinioProvider,
        StorageService,
        RetryStrategy,
        StorageHealthIndicator,
        PinoLogger,
        HealthIndicatorService,
        {
          provide: 'pino-params',
          useValue: {},
        },
        {
          provide: CONFIG_SERVICE,
          useValue: {
            get: (key: string) => {
              const config: Record<string, unknown> = {
                MINIO_ENDPOINT: 'localhost',
                MINIO_PORT: 9000,
                MINIO_USE_SSL: false,
                MINIO_ACCESS_KEY: 'test-key',
                MINIO_SECRET_KEY: 'test-secret',
                MINIO_REGION: 'us-east-1',
                STORAGE_BUCKET_DOCUMENTS: 'documents',
                STORAGE_BUCKET_IMAGES: 'images',
                STORAGE_BUCKET_BACKUPS: 'backups',
                STORAGE_BUCKET_VIDEOS: 'videos',
                MAX_FILE_SIZE: 10485760,
                ALLOWED_MIME_TYPES: 'image/jpeg,image/png,application/pdf',
                RETRY_MAX_ATTEMPTS: 3,
                RETRY_INITIAL_DELAY_MS: 1000,
                RETRY_MAX_DELAY_MS: 10000,
                ENABLE_STORAGE_METRICS: true,
                STORAGE_HEALTH_CHECK_INTERVAL: 30000,
              };
              return config[key];
            },
          },
        },
        {
          provide: 'STORAGE_CONFIG',
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
    }).compile();

    controller = module.get<StorageController>(StorageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
