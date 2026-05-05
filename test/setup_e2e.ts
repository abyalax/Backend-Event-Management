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
  // FIX: baca credentials dari env, bukan hardcode
  const env = envSchema.parse(process.env);
  try {
    const client = new Minio.Client({
      endPoint: endpoint,
      port: port,
      useSSL: false,
      accessKey: env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: env.MINIO_SECRET_KEY || 'minioadmin',
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

const silenceQueueErrors = (queue: Queue): void => {
  // Error chain: ioredis Socket -> ioredis silentEmit -> RedisConnection.handleClientError -> Queue.emit
  // removeAllListeners di Queue saja tidak cukup — harus silence di ioredis client level.
  // (queue as any).connection       = BullMQ RedisConnection instance
  // (queue as any).connection.client = ioredis Redis instance yang buat TCP connection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const redisClient = (queue as any).connection?.client;
  if (redisClient) {
    redisClient.removeAllListeners('error');
    redisClient.removeAllListeners('close');
    redisClient.removeAllListeners('reconnecting');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (queue as any).connection?.removeAllListeners?.('error');
  queue.removeAllListeners('error');
};

const forceCloseResidualConnections = async (moduleFixture: TestingModule): Promise<void> => {
  const queueNames = ['pdf', 'email', 'payment'];

  for (const name of queueNames) {
    try {
      const queue = moduleFixture.get<Queue>(getQueueToken(name), { strict: false });
      if (queue) {
        silenceQueueErrors(queue);
        await queue.close();
        console.log(`Force-closed queue: ${name}`);
      }
    } catch {
      // token not registered, skip
    }
  }

  try {
    const queueService = moduleFixture.get('QueueService', { strict: false });
    if (queueService && typeof queueService.closeAll === 'function') {
      console.log('Force-closing QueueService Redis connections...');
      await queueService.closeAll();
    }
  } catch {
    // QueueService not registered, skip
  }

  try {
    const redisService = moduleFixture.get('RedisService', { strict: false });
    if (redisService && typeof redisService.onModuleDestroy === 'function') {
      console.log('Force-closing RedisService connections...');
      await redisService.onModuleDestroy();
    }
  } catch {
    // RedisService not registered, skip
  }
};

export const cleanupApplication = async (app: INestApplication, moduleFixture?: TestingModule): Promise<void> => {
  try {
    // FIX: app.close() dulu — NestJS lifecycle (onModuleDestroy) berjalan dengan benar
    // Baru setelah itu force-close sisa connection yang mungkin belum tertutup
    if (app) await app.close();
    if (moduleFixture) await forceCloseResidualConnections(moduleFixture);
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
};

export const setupApplication = async (): Promise<[NestExpressApplication, TestingModule, { minio: { endpoint: string; port: number } }]> => {
  process.env.NODE_ENV = 'test';
  process.env.PAYMENT_PROVIDER = 'mock';

  const env = envSchema.parse(process.env);

  // Wait for MinIO to be ready before proceeding
  const minioReady = await waitForMinIO(env.MINIO_ENDPOINT || 'localhost', env.MINIO_PORT || 9000);
  if (!minioReady) throw new Error('MinIO is not ready for testing');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: NestExpressApplication = moduleFixture.createNestApplication();
  app.use(cookieParser(env.COOKIE_SECRET));
  await app.init();

  const originalAppClose = app.close.bind(app);
  app.close = (async () => {
    const server = app.getHttpServer();
    if (server && typeof server.closeAllConnections === 'function') server.closeAllConnections();
    if (server && typeof server.closeIdleConnections === 'function') server.closeIdleConnections();
    return closeWithTimeout(() => originalAppClose() as Promise<void>);
  }) as NestExpressApplication['close'];

  const originalModuleClose = moduleFixture.close.bind(moduleFixture);
  moduleFixture.close = (async () => closeWithTimeout(() => originalModuleClose() as Promise<void>)) as TestingModule['close'];

  clearScheduledJobs(moduleFixture);

  // FIX: gunakan dataSource dari dalam module (sama dengan yang dipakai app)
  // bukan import terpisah dari typeorm.seed — konsisten satu koneksi
  const appDataSource = moduleFixture.get<DataSource>(CONFIG_PROVIDER.PSQL_CONNECTION, { strict: false });
  if (!appDataSource) throw new Error('Database connection not found in test module.');
  await appDataSource.synchronize();

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

const closeWithTimeout = async <T>(closeFn: () => Promise<T>): Promise<T | void> => {
  return new Promise((resolve) => {
    let settled = false;
    // FIX: simpan ref timer supaya bisa di-clearTimeout saat close berhasil sebelum timeout.
    // Tanpa clearTimeout, setTimeout tetap hidup sebagai open handle dan Jest tidak bisa exit.
    let timer: NodeJS.Timeout | null = null;

    const finish = (value?: T) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value);
    };

    void closeFn()
      .then((value) => finish(value))
      .catch((error) => {
        console.error('E2E close failed:', error);
        finish();
      });

    timer = setTimeout(() => {
      if (!settled) {
        console.warn(`Close operation timed out after ${TEST_CLOSE_TIMEOUT_MS}ms — force settling`);
        finish();
      }
    }, TEST_CLOSE_TIMEOUT_MS).unref(); // .unref() supaya timer tidak cegah Node exit jika sudah settle
  });
};

const clearScheduledJobs = (moduleFixture: TestingModule): void => {
  const schedulerRegistry = moduleFixture.get(SchedulerRegistry, { strict: false });
  if (!schedulerRegistry) {
    return;
  }

  for (const [name, job] of schedulerRegistry.getCronJobs()) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    job.stop();
    schedulerRegistry.deleteCronJob(name);
  }

  for (const name of schedulerRegistry.getIntervals()) {
    schedulerRegistry.deleteInterval(name);
  }

  for (const name of schedulerRegistry.getTimeouts()) {
    schedulerRegistry.deleteTimeout(name);
  }
};
