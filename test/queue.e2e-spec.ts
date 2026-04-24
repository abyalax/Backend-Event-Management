/* eslint-disable @typescript-eslint/require-await */
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Job, QueueEvents } from 'bullmq';
import { QueueService } from '~/infrastructure/queue/queue.service';
import { AppModule } from '~/app.module';
import { env } from './common/constant';

type CompleteListener = { jobId: string; returnvalue: string; prev?: string };
type FailedListener = { jobId: string; failedReason: string; prev?: string };

async function waitWithTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string = 'Operation timeout'): Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);
    });

    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

describe('Module Queue', () => {
  let app: INestApplication;
  let queueService: QueueService;
  let queueEvents: QueueEvents;
  let testQueueName: string;
  let failQueueName: string;

  const QUEUE_READY_TIMEOUT = 10000;
  const JOB_PROCESSING_TIMEOUT = 10000;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    queueService = app.get(QueueService);

    console.log({
      host: env.REDIS_HOST,
      port: Number(env.REDIS_PORT),
      password: env.REDIS_PASSWORD ? '***' : undefined,
    });
  }, 30000);

  function initializeQueueEvents(queueName: string) {
    return new QueueEvents(queueName, {
      connection: {
        host: env.REDIS_HOST,
        port: Number(env.REDIS_PORT),
        password: env.REDIS_PASSWORD,
      },
    });
  }

  function waitForJob(queueEvents: QueueEvents, jobId: string, timeout = JOB_PROCESSING_TIMEOUT): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let isResolved = false;

      const timer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(new Error(`Timeout waiting for job ${jobId} (${timeout}ms)`));
        }
      }, timeout);

      const onCompleted = (event: CompleteListener) => {
        if (!isResolved && event.jobId === jobId) {
          isResolved = true;
          cleanup();
          resolve(true);
        }
      };

      const onFailed = (event: FailedListener) => {
        if (!isResolved && event.jobId === jobId) {
          isResolved = true;
          cleanup();
          reject(new Error(`Job failed: ${event.failedReason}`));
        }
      };

      const onError = (error: Error) => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(new Error(`QueueEvents error: ${error.message}`));
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        queueEvents.removeListener('completed', onCompleted);
        queueEvents.removeListener('failed', onFailed);
        queueEvents.removeListener('error', onError);
      };

      queueEvents.on('completed', onCompleted);
      queueEvents.on('failed', onFailed);
      queueEvents.on('error', onError);
    });
  }

  async function setupQueues() {
    testQueueName = `test-queue-${Date.now()}`;
    failQueueName = `fail-test-${Date.now()}`;

    if (queueEvents) {
      try {
        await queueEvents.close();
      } catch (error) {
        console.error('Error closing previous queueEvents:', error);
      }
    }

    queueEvents = initializeQueueEvents(testQueueName);

    await waitWithTimeout(queueEvents.waitUntilReady(), QUEUE_READY_TIMEOUT, 'QueueEvents ready timeout');

    queueService.registerQueue(testQueueName, [
      {
        name: 'test-job',
        handler: async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
        },
        options: {
          attempts: 1,
          removeOnComplete: false,
          timeout: 10000,
        },
      },
    ]);

    queueService.registerQueue(failQueueName, [
      {
        name: 'fail-job',
        handler: async () => {
          throw new Error('Test job failed intentionally');
        },
        options: {
          attempts: 1,
          removeOnFail: true,
          timeout: 10000,
        },
      },
    ]);

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  describe('Single Job Processing', () => {
    beforeEach(async () => await setupQueues());

    it(
      'should process single job',
      async () => {
        const job: Job = await queueService.addJob(
          testQueueName,
          'test-job',
          { data: 'data test' },
          {
            attempts: 1,
            removeOnComplete: false,
          },
        );

        expect(job).toBeDefined();
        expect(job.id).toBeDefined();

        const result = await waitForJob(queueEvents, job.id as string);
        expect(result).toBe(true);
      },
      JOB_PROCESSING_TIMEOUT + 5000,
    );
  });

  describe('Multiple Jobs Processing', () => {
    beforeEach(async () => {
      await setupQueues();
    });

    it(
      'should process multiple jobs',
      async () => {
        const jobCount = 5;

        const jobs = await Promise.all(
          Array.from({ length: jobCount }).map((_, i) =>
            queueService.addJob(
              testQueueName,
              'test-job',
              { index: i },
              {
                attempts: 1,
                removeOnComplete: false,
              },
            ),
          ),
        );

        expect(jobs.length).toBe(jobCount);

        const results = await Promise.allSettled(jobs.map((job) => waitForJob(queueEvents, job.id as string)));

        const successCount = results.filter((r) => r.status === 'fulfilled').length;
        expect(successCount).toBe(jobCount);

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Job ${index} failed:`, result.reason);
          }
        });
      },
      JOB_PROCESSING_TIMEOUT + 10000,
    );
  });

  describe('Job Failure Handling', () => {
    beforeEach(async () => {
      testQueueName = `test-queue-${Date.now()}`;
      failQueueName = `fail-test-${Date.now()}`;

      if (queueEvents) {
        try {
          await queueEvents.close();
        } catch (error) {
          console.error('Error closing previous queueEvents:', error);
        }
      }

      queueEvents = initializeQueueEvents(failQueueName);

      await waitWithTimeout(queueEvents.waitUntilReady(), QUEUE_READY_TIMEOUT, 'QueueEvents ready timeout');

      queueService.registerQueue(testQueueName, [
        {
          name: 'test-job',
          handler: async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
          },
          options: {
            attempts: 1,
            removeOnComplete: false,
            timeout: 10000,
          },
        },
      ]);

      queueService.registerQueue(failQueueName, [
        {
          name: 'fail-job',
          handler: async () => {
            throw new Error('Test job failed intentionally');
          },
          options: {
            attempts: 1,
            removeOnFail: true,
            timeout: 10000,
          },
        },
      ]);

      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    it(
      'should handle failed job properly',
      async () => {
        const job = await queueService.addJob(
          failQueueName,
          'fail-job',
          { data: 'failed' },
          {
            attempts: 1,
            removeOnFail: true,
          },
        );

        expect(job).toBeDefined();
        expect(job.id).toBeDefined();

        try {
          await waitForJob(queueEvents, job.id as string, JOB_PROCESSING_TIMEOUT * 2);
          fail('Should have thrown error');
        } catch (error) {
          expect(error).toBeDefined();
          expect(error instanceof Error).toBe(true);
          if (error instanceof Error) {
            expect(error.message).toContain('failed');
          }
        }
      },
      JOB_PROCESSING_TIMEOUT + 5000,
    );
  });

  describe('Concurrency Handling', () => {
    beforeEach(async () => await setupQueues());

    it(
      'should handle concurrent jobs',
      async () => {
        const jobCount = 10;
        const startTime = Date.now();

        const jobs = await Promise.all(
          Array.from({ length: jobCount }).map((_, i) =>
            queueService.addJob(
              testQueueName,
              'test-job',
              { index: i, timestamp: Date.now() },
              {
                attempts: 1,
                removeOnComplete: false,
              },
            ),
          ),
        );

        expect(jobs.length).toBe(jobCount);

        const results = await Promise.allSettled(jobs.map((job) => waitForJob(queueEvents, job.id as string, JOB_PROCESSING_TIMEOUT * 2)));

        const duration = Date.now() - startTime;
        const successCount = results.filter((r) => r.status === 'fulfilled').length;

        console.log({
          jobCount,
          successCount,
          duration: `${duration}ms`,
          avgTimePerJob: `${Math.round(duration / jobCount)}ms`,
        });

        expect(successCount).toBe(jobCount);

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Job ${index} failed:`, result.reason);
          }
        });
      },
      JOB_PROCESSING_TIMEOUT * 3,
    );
  });

  describe('Queue Statistics', () => {
    beforeEach(async () => await setupQueues());

    it(
      'should track queue stats correctly',
      async () => {
        const job = await queueService.addJob(testQueueName, 'test-job', { data: 'test' }, { attempts: 1, removeOnComplete: false });

        await waitForJob(queueEvents, job.id as string);

        await new Promise((resolve) => setTimeout(resolve, 100));

        const stats = await queueService.getQueueStats(testQueueName);

        expect(stats).toBeDefined();
        expect(stats.active).toBeDefined();
        expect(stats.completed).toBeGreaterThan(0);
        expect(stats.delayed).toBeDefined();
        expect(stats.failed).toBeDefined();
        expect(stats.paused).toBeDefined();
        expect(stats.waiting).toBeDefined();
      },
      JOB_PROCESSING_TIMEOUT + 5000,
    );
  });

  afterEach(async () => {
    if (queueEvents) {
      try {
        await queueEvents.close();
      } catch (error) {
        console.error('Error closing queueEvents:', error);
      }
    }
  });

  afterAll(async () => {
    try {
      await queueService.closeAll();
    } catch (error) {
      console.error('Error closing queueService:', error);
    }

    try {
      if (app) {
        await app.close();
      }
    } catch (error) {
      console.error('Error closing app:', error);
    }
  }, 30000);
});
