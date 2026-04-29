/* eslint-disable @typescript-eslint/no-unsafe-call */
import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as cookieParser from 'cookie-parser';
import * as Minio from 'minio';
import { DataSource } from 'typeorm';
import { AppModule } from '~/app.module';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { envSchema } from '~/infrastructure/config/config.schema';
import UserSeeder from '~/infrastructure/database/seeds/1_users.seed';
import EventSeeder from '~/infrastructure/database/seeds/2_events.seed';
import TicketSeeder from '~/infrastructure/database/seeds/3_tickets.seed';
import OrderSeeder from '~/infrastructure/database/seeds/4_orders.seed';
import { dataSource } from '../typeorm.seed';

const TEST_CLOSE_TIMEOUT_MS = 10_000;

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

  for (const file of fileTracker.getUploadedFiles()) {
    try {
      await client.removeObject(file.bucket, file.filename);
      console.log(`Cleaned up file: ${file.bucket}/${file.filename}`);
    } catch (error) {
      console.warn(`Failed to cleanup file ${file.bucket}/${file.filename}:`, error);
    }
  }

  fileTracker.clear();
};

const closeQueues = async (moduleFixture: TestingModule): Promise<void> => {
  const queueNames = ['pdf', 'email', 'payment'];

  for (const name of queueNames) {
    try {
      const queue = moduleFixture.get<Queue>(getQueueToken(name), { strict: false });
      if (queue) {
        await queue.close();
        console.log(`Closed queue: ${name}`);
      }
    } catch {
      // token not registered, skip
    }
  }
};

export const cleanupApplication = async (app: INestApplication, moduleFixture?: TestingModule): Promise<void> => {
  try {
    // Close queues first if module fixture is provided
    if (moduleFixture) await closeQueues(moduleFixture);

    // Then close the app
    if (app) await app.close();
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
};

export const setupApplication = async (): Promise<[NestExpressApplication, TestingModule, { minio: { endpoint: string; port: number } }]> => {
  process.env.NODE_ENV = 'test';

  const env = envSchema.parse(process.env);

  // Wait for MinIO to be ready before proceeding
  const minioReady = await waitForMinIO(env.MINIO_ENDPOINT || 'localhost', env.MINIO_PORT || 9000);
  if (!minioReady) {
    throw new Error('MinIO is not ready for testing');
  }

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: NestExpressApplication = moduleFixture.createNestApplication();
  app.use(cookieParser(env.COOKIE_SECRET));
  await app.init();

  const originalAppClose = app.close.bind(app);
  app.close = (async () => {
    const server = app.getHttpServer();
    if (server && typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    if (server && typeof server.closeIdleConnections === 'function') {
      server.closeIdleConnections();
    }

    return closeWithTimeout(() => originalAppClose() as Promise<void>);
  }) as NestExpressApplication['close'];

  const originalModuleClose = moduleFixture.close.bind(moduleFixture);
  moduleFixture.close = (async () => closeWithTimeout(() => originalModuleClose() as Promise<void>)) as TestingModule['close'];

  clearScheduledJobs(moduleFixture);
  await resetTestDatabase(moduleFixture);
  await seedTestData(dataSource);

  return [
    app,
    moduleFixture,
    {
      minio: {
        endpoint: env.MINIO_ENDPOINT || 'localhost',
        port: env.MINIO_PORT || 9000,
      },
    },
  ];
};

const closeWithTimeout = async <T>(closeFn: () => Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (value?: T, error?: Error) => {
      if (settled) return;
      settled = true;

      if (error) {
        reject(error);
      } else {
        resolve(value as T);
      }
    };

    void closeFn()
      .then((value) => finish(value))
      .catch((error) => {
        console.error('E2E close failed:', error);
        finish(undefined, error instanceof Error ? error : new Error(String(error)));
      });

    setTimeout(() => {
      if (!settled) {
        const timeoutError = new Error(`Close operation timed out after ${TEST_CLOSE_TIMEOUT_MS}ms`);
        console.error('E2E close timeout:', timeoutError);
        finish(undefined, timeoutError);
      }
    }, TEST_CLOSE_TIMEOUT_MS);
  });
};

const clearScheduledJobs = (moduleFixture: TestingModule): void => {
  const schedulerRegistry = moduleFixture.get(SchedulerRegistry, { strict: false });
  if (!schedulerRegistry) {
    return;
  }

  for (const [name, job] of schedulerRegistry.getCronJobs()) {
    void job.stop();
    schedulerRegistry.deleteCronJob(name);
  }

  for (const name of schedulerRegistry.getIntervals()) {
    schedulerRegistry.deleteInterval(name);
  }

  for (const name of schedulerRegistry.getTimeouts()) {
    schedulerRegistry.deleteTimeout(name);
  }
};

const resetTestDatabase = async (moduleFixture: TestingModule): Promise<void> => {
  const dataSource = moduleFixture.get<DataSource>(CONFIG_PROVIDER.PSQL_CONNECTION, { strict: false });
  if (!dataSource) {
    throw new Error('Database connection not found in test module. Cannot reset test database.');
  }

  const tables = await dataSource.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> 'migrations'
    ORDER BY tablename
  `);

  const tableNames = tables
    .map((row: { tablename?: string }) => row.tablename)
    .filter((tableName: string | undefined): tableName is string => Boolean(tableName))
    .map((tableName: string) => `"${tableName.replaceAll('"', '""')}"`);

  if (tableNames.length > 0) {
    await dataSource.query(`TRUNCATE TABLE ${tableNames.join(', ')} RESTART IDENTITY CASCADE`);
  }

  console.log('Database reset completed successfully');
};

export const seedTestData = async (dataSource: DataSource): Promise<void> => {
  try {
    // Ensure DB initialized
    if (!dataSource.isInitialized) {
      console.log('[Seeder] Initializing data source...');
      await dataSource.initialize();
    }

    const userSeeder = new UserSeeder();
    const eventSeeder = new EventSeeder();
    const ticketSeeder = new TicketSeeder();
    const orderSeeder = new OrderSeeder();

    // Run sequentially (STRICT ORDER)
    console.log('[Seeder] Seeding users...');
    await userSeeder.run(dataSource);

    console.log('[Seeder] Seeding events...');
    await eventSeeder.run(dataSource);

    console.log('[Seeder] Seeding tickets...');
    await ticketSeeder.run(dataSource);

    console.log('[Seeder] Seeding orders...');
    await orderSeeder.run(dataSource);

    console.log('[Seeder] ✅ Database seeds completed successfully');
  } catch (error) {
    console.error('[Seeder] ❌ Failed:', error);
    throw error;
  }
};
