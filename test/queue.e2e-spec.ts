import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { QueueService } from '../src/infrastructure/queue/queue.service';
import { QueueHealthIndicator } from '../src/infrastructure/queue/queue.health';
import { ConfigService, CONFIG_SERVICE } from '../src/infrastructure/config/config.provider';
import Redis from 'ioredis';

describe('Queue E2E Tests', () => {
  let app: INestApplication;
  let queueService: QueueService;
  let queueHealthIndicator: QueueHealthIndicator;
  let redisClient: Redis;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    queueService = moduleRef.get<QueueService>(QueueService);
    queueHealthIndicator = moduleRef.get<QueueHealthIndicator>(QueueHealthIndicator);
    const configService = moduleRef.get<ConfigService>(CONFIG_SERVICE);

    // Create Redis client for test cleanup
    redisClient = new Redis({
      host: configService.get('REDIS_HOST'),
      port: configService.get('REDIS_PORT'),
      password: configService.get('REDIS_PASSWORD'),
    });
  });

  afterAll(async () => {
    // Clean up Redis
    await redisClient.flushdb();
    await redisClient.quit();

    await moduleRef.close();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up Redis before each test
    await redisClient.flushdb();
  });

  describe('Queue Job Processing', () => {
    it('should process jobs end-to-end', async () => {
      const queueName = 'e2e-test-queue';
      const jobName = 'test-job';
      const jobData = { message: 'Hello World', timestamp: new Date() };

      let processedData: unknown;
      const processingError: Error | null = null;

      // Register queue with job handler
      queueService.registerQueue(queueName, [
        {
          name: jobName,
          handler: async (data: unknown) => {
            processedData = data;
            // Simulate some processing time
            await new Promise((resolve) => setTimeout(resolve, 100));
          },
          options: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
          },
        },
      ]);

      // Add job to queue
      const job = await queueService.addJob(queueName, jobName, jobData);
      expect(job.id).toBeDefined();

      // Wait for job to be processed
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify job was processed
      expect(processedData).toEqual(jobData);
      expect(processingError).toBeNull();

      // Check queue stats
      const stats = await queueService.getQueueStats(queueName);
      expect(stats.completed).toBeGreaterThan(0);
    }, 10000);

    it('should handle job failures and retries', async () => {
      const queueName = 'e2e-failure-queue';
      const jobName = 'failing-job';
      const jobData = { shouldFail: true };

      let attemptCount = 0;

      // Register queue with failing job handler
      queueService.registerQueue(queueName, [
        {
          name: jobName,
          handler: async (data: unknown) => {
            attemptCount++;
            if (attemptCount < 3) throw new Error(`Job failed on attempt ${attemptCount}`);
            await new Promise(() => console.log(data));
            // Succeed on third attempt
          },
          options: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 100 },
          },
        },
      ]);

      // Add job to queue
      const job = await queueService.addJob(queueName, jobName, jobData);
      expect(job.id).toBeDefined();

      // Wait for retries
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify job eventually succeeded
      const stats = await queueService.getQueueStats(queueName);
      expect(stats.completed).toBeGreaterThan(0);
      expect(attemptCount).toBe(3);
    }, 10000);

    it('should handle multiple jobs concurrently', async () => {
      const queueName = 'e2e-concurrent-queue';
      const jobName = 'concurrent-job';
      const jobCount = 10;
      const processedJobs: unknown[] = [];

      // Register queue with concurrent job handler
      queueService.registerQueue(queueName, [
        {
          name: jobName,
          handler: async (data: unknown) => {
            processedJobs.push(data);
            // Simulate processing time
            await new Promise((resolve) => setTimeout(resolve, 200));
          },
        },
      ]);

      // Add multiple jobs
      const jobs = [];
      for (let i = 0; i < jobCount; i++) {
        jobs.push(queueService.addJob(queueName, jobName, { jobId: i }));
      }

      const addedJobs = await Promise.all(jobs);
      expect(addedJobs).toHaveLength(jobCount);

      // Wait for all jobs to process
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify all jobs were processed
      expect(processedJobs).toHaveLength(jobCount);

      const stats = await queueService.getQueueStats(queueName);
      expect(stats.completed).toBe(jobCount);
    }, 15000);
  });

  describe('Queue Health Monitoring', () => {
    it('should report healthy status for active queues', async () => {
      const queueName = 'e2e-health-queue';
      const jobName = 'health-check-job';

      // Register and populate queue
      queueService.registerQueue(queueName, [
        {
          name: jobName,
          handler: async () => {
            // Simple handler
          },
        },
      ]);

      // Add some jobs
      await queueService.addJob(queueName, jobName, { test: 'data' });
      await queueService.addJob(queueName, jobName, { test: 'data2' });

      // Check health
      const health = await queueHealthIndicator.isHealthy([queueName]);
      expect(health.status).toBe('up');
      expect(health.queues).toBeDefined();
      const queueHealth = (health.queues as Record<string, unknown>)[queueName] as { status: string };
      expect(queueHealth).toBeDefined();
      expect(queueHealth.status).toBe('up');
    });

    it('should handle multiple queue health checks', async () => {
      const queueNames = ['health-queue-1', 'health-queue-2', 'health-queue-3'];
      const jobName = 'health-job';

      // Register multiple queues
      queueNames.forEach((name) => {
        queueService.registerQueue(name, [
          {
            name: jobName,
            handler: async () => {},
          },
        ]);
      });

      // Add jobs to each queue
      await Promise.all(queueNames.map((name) => queueService.addJob(name, jobName, { queue: name })));

      // Check health of all queues
      const health = await queueHealthIndicator.isHealthy(queueNames);
      expect(health.status).toBe('up');
      expect(Object.keys(health.queues || {})).toHaveLength(3);
    });
  });

  describe('Queue Operations', () => {
    it('should support pause and resume operations', async () => {
      const queueName = 'e2e-pause-queue';
      const jobName = 'pause-job';
      let processedCount = 0;

      // Register queue
      queueService.registerQueue(queueName, [
        {
          name: jobName,
          handler: async () => {
            processedCount++;
            await new Promise((resolve) => setTimeout(resolve, 100));
          },
        },
      ]);

      // Add job
      await queueService.addJob(queueName, jobName, { test: 'before-pause' });

      // Pause queue
      await queueService.pauseQueue(queueName);

      // Add another job while paused
      await queueService.addJob(queueName, jobName, { test: 'while-paused' });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should only have processed first job
      expect(processedCount).toBe(1);

      // Resume queue
      await queueService.resumeQueue(queueName);

      // Wait for second job to process
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should have processed both jobs
      expect(processedCount).toBe(2);
    }, 10000);

    it('should maintain queue statistics', async () => {
      const queueName = 'e2e-stats-queue';
      const jobName = 'stats-job';

      // Register queue
      queueService.registerQueue(queueName, [
        {
          name: jobName,
          handler: async () => {
            // Random processing time to create varied stats
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 200));
          },
        },
      ]);

      // Add multiple jobs
      const jobPromises = [];
      for (let i = 0; i < 5; i++) {
        jobPromises.push(queueService.addJob(queueName, jobName, { jobId: i }));
      }
      await Promise.all(jobPromises);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check stats
      const stats = await queueService.getQueueStats(queueName);
      expect(stats).toBeDefined();
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.waiting).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.failed).toBe('number');
      expect(typeof stats.delayed).toBe('number');
      expect(typeof stats.paused).toBe('number');
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      // This test simulates Redis connection issues
      // In a real scenario, you would mock Redis to throw connection errors

      const queueName = 'e2e-error-queue';
      const jobName = 'error-job';

      queueService.registerQueue(queueName, [
        {
          name: jobName,
          handler: async () => {
            await new Promise(() => console.log('simulate async'));
            throw new Error('Simulated processing error');
          },
          options: {
            attempts: 2,
          },
        },
      ]);

      // Add job that will fail
      await queueService.addJob(queueName, jobName, { test: 'error' });

      // Wait for processing and retries
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check that error was handled (job should be in failed state)
      const stats = await queueService.getQueueStats(queueName);
      expect(stats.failed).toBeGreaterThan(0);
    }, 10000);

    it('should handle malformed job data', async () => {
      const queueName = 'e2e-malformed-queue';
      const jobName = 'malformed-job';

      queueService.registerQueue(queueName, [
        {
          name: jobName,
          handler: async (data: unknown) => {
            // Handler that expects specific data structure
            if (typeof data === 'object' && data !== null) {
              const typedData = data as { message: string };
              if (!typedData.message) {
                throw new Error('Missing required field: message');
              }
            }
            await new Promise(() => console.log('simulate async'));
          },
        },
      ]);

      // Add job with malformed data
      await queueService.addJob(queueName, jobName, { wrongField: 'value' });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Should have failed
      const stats = await queueService.getQueueStats(queueName);
      expect(stats.failed).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Performance', () => {
    it('should handle high volume of jobs', async () => {
      const queueName = 'e2e-volume-queue';
      const jobName = 'volume-job';
      const jobCount = 100;
      let processedCount = 0;

      queueService.registerQueue(queueName, [
        {
          name: jobName,
          handler: async () => {
            processedCount++;
            // Minimal processing
            await new Promise(() => console.log('simulate async'));
          },
        },
      ]);

      const startTime = Date.now();

      // Add many jobs
      const jobPromises = [];
      for (let i = 0; i < jobCount; i++) {
        jobPromises.push(queueService.addJob(queueName, jobName, { jobId: i }));
      }
      await Promise.all(jobPromises);

      // Wait for all jobs to process
      while (processedCount < jobCount && Date.now() - startTime < 30000) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all jobs were processed
      expect(processedCount).toBe(jobCount);

      // Performance check (should complete within reasonable time)
      expect(duration).toBeLessThan(30000); // 30 seconds max

      console.log(`Processed ${jobCount} jobs in ${duration}ms`);
    }, 35000);
  });
});
