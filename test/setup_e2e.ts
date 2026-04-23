import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '~/app.module';
import { envSchema } from '~/infrastructure/config/config.schema';
import * as Minio from 'minio';

let cachedApp: NestExpressApplication | null = null;
let cachedModule: TestingModule | null = null;

export interface UploadedFile {
  bucket: string;
  filename: string;
}

export class TestFileTracker {
  private files: UploadedFile[] = [];

  trackFile(bucket: string, filename: string): void {
    this.files.push({ bucket, filename });
  }

  getUploadedFiles(): UploadedFile[] {
    return this.files;
  }

  clear(): void {
    this.files = [];
  }
}

export const waitForMinIO = async (endpoint: string, port: number): Promise<boolean> => {
  try {
    const client = new Minio.Client({
      endPoint: endpoint,
      port: port,
      useSSL: false,
      accessKey: 'minioadmin',
      secretKey: 'minioadmin',
    });

    // Try to list buckets to verify connection
    await client.listBuckets();
    return true;
  } catch (error) {
    console.warn('MinIO connection failed:', error);
    return false;
  }
};

export const cleanupUploadedFiles = async (
  fileTracker: TestFileTracker,
  endpoint: string,
  port: number,
  accessKey: string,
  secretKey: string,
): Promise<void> => {
  const client = new Minio.Client({
    endPoint: endpoint,
    port: port,
    useSSL: false,
    accessKey,
    secretKey,
  });

  const files = fileTracker.getUploadedFiles();

  for (const file of files) {
    try {
      await client.removeObject(file.bucket, file.filename);
      console.log(`Cleaned up file: ${file.bucket}/${file.filename}`);
    } catch (error) {
      console.warn(`Failed to cleanup file ${file.bucket}/${file.filename}:`, error);
    }
  }

  fileTracker.clear();
};

export const cleanupApplication = async (app: INestApplication): Promise<void> => {
  if (app) {
    await app.close();
  }
};

export const setupApplication = async (): Promise<[NestExpressApplication, TestingModule, any]> => {
  if (cachedApp && cachedModule) {
    const config = {
      minio: {
        endpoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: Number.parseInt(process.env.MINIO_PORT || '9000'),
      },
    };
    return [cachedApp, cachedModule, config];
  }

  // Set test environment
  process.env.NODE_ENV = 'test';

  const env = envSchema.parse(process.env);

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: NestExpressApplication = moduleFixture.createNestApplication();
  app.use(cookieParser(env.COOKIE_SECRET));
  await app.init();

  // Seed test data using real database
  await seedTestData();

  cachedApp = app;
  cachedModule = moduleFixture;

  const config = {
    minio: {
      endpoint: env.MINIO_ENDPOINT || 'localhost',
      port: env.MINIO_PORT || 9000,
    },
  };

  return [app, moduleFixture, config];
};

const seedTestData = async (): Promise<void> => {
  try {
    // Run database seeds using the existing seed command
    const { execSync } = await import('node:child_process');
    console.log('🌱 Running database seeds for tests...');
    execSync('pnpm seed:run', { stdio: 'inherit' });
    console.log('✅ Database seeds completed successfully');
  } catch (error) {
    console.error('❌ Failed to run database seeds:', error);
    // Don't throw error - tests can still run even if seeding fails
  }
};
