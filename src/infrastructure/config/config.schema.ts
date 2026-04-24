import 'dotenv/config';
import z from 'zod';

export const envSchema = z.object({
  PORT: z.string({ message: 'PORT Aplication is required' }),
  JWT_SECRET: z.string({ message: 'JWT secret is required' }),
  JWT_PRIVATE_KEY: z.string({ message: 'JWT private key is required' }),
  JWT_PUBLIC_KEY: z.string({ message: 'JWT public key is required' }),
  JWT_EXPIRATION: z.string({ message: 'JWT expiration is required' }),
  JWT_REFRESH_SECRET: z.string({ message: 'JWT refresh secret is required' }),
  JWT_REFRESH_EXPIRATION: z.string({
    message: 'JWT refresh expiration is required',
  }),

  DATABASE_URL: z.string({ message: 'Required Database URL' }),
  DATABASE_TYPE: z.string({ message: 'Required Database Type' }),

  REDIS_HOST: z.string({ message: 'REDIS_HOST is required' }),
  REDIS_PORT: z.coerce.number({ message: 'REDIS_PORT is required' }),
  REDIS_PASSWORD: z.string({ message: 'REDIS_PASSWORD is required' }),

  COOKIE_SECRET: z.string({ message: 'Cookie secret is required' }),

  // Mailpit Configuration
  MAILPIT_HOST: z.string({ message: 'MAILPIT_HOST is required' }),
  MAILPIT_PORT: z.string({ message: 'MAILPIT_PORT is required' }),
  MAILPIT_SECURE: z.string({ message: 'MAILPIT_SECURE is required' }),
  MAILPIT_USER: z.string({ message: 'MAILPIT_USER is required' }),
  MAILPIT_PASSWORD: z.string({ message: 'MAILPIT_PASSWORD is required' }),
  MAILPIT_FROM_EMAIL: z.string({ message: 'MAILPIT_FROM_EMAIL is required' }),
  MAILPIT_FROM_NAME: z.string({ message: 'MAILPIT_FROM_NAME is required' }),

  // MinIO Configuration
  MINIO_ENDPOINT: z.string({ message: 'MinIO endpoint is required' }),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  MINIO_ACCESS_KEY: z.string({ message: 'MinIO access key is required' }),
  MINIO_SECRET_KEY: z.string({ message: 'MinIO secret key is required' }),
  MINIO_REGION: z.string().default('us-east-1'),

  // Storage Bucket Configuration
  STORAGE_BUCKET_DOCUMENTS: z.string().default('documents'),
  STORAGE_BUCKET_IMAGES: z.string().default('images'),
  STORAGE_BUCKET_BACKUPS: z.string().default('backups'),
  STORAGE_BUCKET_VIDEOS: z.string().default('videos'),

  // File Constraints
  MAX_FILE_SIZE: z.coerce.number().default(52428800), // 50MB
  ALLOWED_MIME_TYPES: z.string().optional(),

  // Retry Strategy Configuration
  RETRY_MAX_ATTEMPTS: z.coerce.number().default(3),
  RETRY_INITIAL_DELAY_MS: z.coerce.number().default(100),
  RETRY_MAX_DELAY_MS: z.coerce.number().default(5000),

  // Monitoring Configuration
  ENABLE_STORAGE_METRICS: z.coerce.boolean().default(true),
  STORAGE_HEALTH_CHECK_INTERVAL: z.coerce.number().default(30000),

  // Queue Configuration
  QUEUE_CONCURRENCY: z.coerce.number().default(5),
});

export type Environment = z.infer<typeof envSchema>;
