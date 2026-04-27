/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { PinoLogger } from 'nestjs-pino';
import { CONFIG_SERVICE } from '../config/config.provider';
import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';

jest.mock('bullmq', () => ({
  Queue: jest.fn(() => mockQueue),
  Worker: jest.fn(() => mockWorker),
}));
jest.mock('ioredis', () => ({
  default: jest.fn(() => mockRedis),
}));

const mockRedis = {
  quit: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
};

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
  getActiveCount: jest.fn().mockResolvedValue(5),
  getWaitingCount: jest.fn().mockResolvedValue(3),
  getCompletedCount: jest.fn().mockResolvedValue(10),
  getFailedCount: jest.fn().mockResolvedValue(2),
  getDelayedCount: jest.fn().mockResolvedValue(1),
  pause: jest.fn().mockResolvedValue(undefined),
  resume: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockWorker = {
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};

describe('QueueService', () => {
  let service: QueueService;
  let mockLogger: jest.Mocked<PinoLogger>;

  beforeEach(async () => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      setContext: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>;

    const mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        const config = {
          REDIS_HOST: 'localhost',
          REDIS_PORT: 6379,
          QUEUE_CONCURRENCY: 5,
        };
        return config[key as keyof typeof config];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: CONFIG_SERVICE,
          useValue: mockConfig,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create Redis connection with correct config', () => {
      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: expect.any(Function),
      });
    });
  });

  describe('registerQueue', () => {
    it('should register a queue with job configurations', () => {
      const queueName = 'test-queue';
      const jobConfigs = [
        {
          name: 'test-job',
          handler: jest.fn().mockResolvedValue(undefined),
          options: {
            attempts: 3,
            backoff: { type: 'exponential' as const, delay: 2000 },
          },
        },
      ];

      service.registerQueue(queueName, jobConfigs);

      expect(Queue).toHaveBeenCalledWith(queueName, {
        connection: mockRedis,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      });

      expect(Worker).toHaveBeenCalledWith(queueName, expect.any(Function), {
        connection: mockRedis,
        concurrency: 5,
      });

      expect(mockLogger.info).toHaveBeenCalledWith({ queue: queueName, jobs: 1 }, 'Queue registered');
    });

    it('should handle multiple job configurations', () => {
      const queueName = 'multi-job-queue';
      const jobConfigs = [
        {
          name: 'job1',
          handler: jest.fn().mockResolvedValue(undefined),
        },
        {
          name: 'job2',
          handler: jest.fn().mockResolvedValue(undefined),
        },
      ];

      service.registerQueue(queueName, jobConfigs);

      expect(Worker).toHaveBeenCalledTimes(2);
      expect(mockWorker.on).toHaveBeenCalledTimes(8); // 4 events per worker
    });

    it('should set up worker event listeners', () => {
      const queueName = 'event-queue';
      const jobConfigs = [
        {
          name: 'test-job',
          handler: jest.fn().mockResolvedValue(undefined),
        },
      ];

      service.registerQueue(queueName, jobConfigs);

      expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });
  });

  describe('addJob', () => {
    beforeEach(() => {
      const queueName = 'test-queue';
      const jobConfigs = [
        {
          name: 'test-job',
          handler: jest.fn().mockResolvedValue(undefined),
        },
      ];
      service.registerQueue(queueName, jobConfigs);
    });

    it('should add a job to the queue', async () => {
      const queueName = 'test-queue';
      const jobName = 'test-job';
      const data = { test: 'data' };

      const result = await service.addJob(queueName, jobName, data);

      expect(mockQueue.add).toHaveBeenCalledWith(jobName, data, undefined);
      expect(mockLogger.debug).toHaveBeenCalledWith({ queue: queueName, jobName, jobId: 'test-job-id', data }, 'Job added');
      expect(result).toEqual({ id: 'test-job-id' });
    });

    it('should add a job with options', async () => {
      const queueName = 'test-queue';
      const jobName = 'test-job';
      const data = { test: 'data' };
      const options = { priority: 10, delay: 1000 };

      await service.addJob(queueName, jobName, data, options);

      expect(mockQueue.add).toHaveBeenCalledWith(jobName, data, options);
    });

    it('should throw error if queue is not found', async () => {
      const queueName = 'non-existent-queue';
      const jobName = 'test-job';
      const data = { test: 'data' };

      await expect(service.addJob(queueName, jobName, data)).rejects.toThrow('Queue non-existent-queue not found');
    });
  });

  describe('getQueueStats', () => {
    beforeEach(() => {
      const queueName = 'test-queue';
      const jobConfigs = [
        {
          name: 'test-job',
          handler: jest.fn().mockResolvedValue(undefined),
        },
      ];
      service.registerQueue(queueName, jobConfigs);
    });

    it('should return queue statistics', async () => {
      const queueName = 'test-queue';

      const result = await service.getQueueStats(queueName);

      expect(result).toEqual({
        active: 5,
        waiting: 3,
        completed: 10,
        failed: 2,
        delayed: 1,
        paused: 0,
      });

      expect(mockQueue.getActiveCount).toHaveBeenCalled();
      expect(mockQueue.getWaitingCount).toHaveBeenCalled();
      expect(mockQueue.getCompletedCount).toHaveBeenCalled();
      expect(mockQueue.getFailedCount).toHaveBeenCalled();
      expect(mockQueue.getDelayedCount).toHaveBeenCalled();
      // getPausedCount is not available in BullMQ, so we skip this assertion
    });

    it('should throw error if queue is not found', async () => {
      const queueName = 'non-existent-queue';

      await expect(service.getQueueStats(queueName)).rejects.toThrow('Queue non-existent-queue not found');
    });
  });

  describe('pauseQueue', () => {
    beforeEach(() => {
      const queueName = 'test-queue';
      const jobConfigs = [
        {
          name: 'test-job',
          handler: jest.fn().mockResolvedValue(undefined),
        },
      ];
      service.registerQueue(queueName, jobConfigs);
    });

    it('should pause the queue', async () => {
      const queueName = 'test-queue';

      await service.pauseQueue(queueName);

      expect(mockQueue.pause).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith({ queue: queueName }, 'Queue paused');
    });

    it('should throw error if queue is not found', async () => {
      const queueName = 'non-existent-queue';

      await expect(service.pauseQueue(queueName)).rejects.toThrow('Queue non-existent-queue not found');
    });
  });

  describe('resumeQueue', () => {
    beforeEach(() => {
      const queueName = 'test-queue';
      const jobConfigs = [
        {
          name: 'test-job',
          handler: jest.fn().mockResolvedValue(undefined),
        },
      ];
      service.registerQueue(queueName, jobConfigs);
    });

    it('should resume the queue', async () => {
      const queueName = 'test-queue';

      await service.resumeQueue(queueName);

      expect(mockQueue.resume).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith({ queue: queueName }, 'Queue resumed');
    });

    it('should throw error if queue is not found', async () => {
      const queueName = 'non-existent-queue';

      await expect(service.resumeQueue(queueName)).rejects.toThrow('Queue non-existent-queue not found');
    });
  });

  describe('closeAll', () => {
    beforeEach(() => {
      const queueName = 'test-queue';
      const jobConfigs = [
        {
          name: 'test-job',
          handler: jest.fn().mockResolvedValue(undefined),
        },
      ];
      service.registerQueue(queueName, jobConfigs);
    });

    it('should close all workers and queues', async () => {
      await service.closeAll();

      expect(mockWorker.close).toHaveBeenCalled();
      expect(mockQueue.close).toHaveBeenCalled();
      expect(mockRedis.quit).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('All queues and workers closed successfully');
    });
  });

  describe('getQueue', () => {
    beforeEach(() => {
      const queueName = 'test-queue';
      const jobConfigs = [
        {
          name: 'test-job',
          handler: jest.fn().mockResolvedValue(undefined),
        },
      ];
      service.registerQueue(queueName, jobConfigs);
    });

    it('should return the queue instance', () => {
      const queueName = 'test-queue';
      const result = service.getQueue(queueName);

      expect(result).toBe(mockQueue);
    });

    it('should return undefined for non-existent queue', () => {
      const queueName = 'non-existent-queue';
      const result = service.getQueue(queueName);

      expect(result).toBeUndefined();
    });
  });

  describe('getWorker', () => {
    beforeEach(() => {
      const queueName = 'test-queue';
      const jobConfigs = [
        {
          name: 'test-job',
          handler: jest.fn().mockResolvedValue(undefined),
        },
      ];
      service.registerQueue(queueName, jobConfigs);
    });

    it('should return the worker instance', () => {
      const key = 'test-queue:test-job';
      const result = service.getWorker(key);

      expect(result).toBe(mockWorker);
    });

    it('should return undefined for non-existent worker', () => {
      const key = 'non-existent-key';
      const result = service.getWorker(key);

      expect(result).toBeUndefined();
    });
  });
});
