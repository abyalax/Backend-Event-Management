/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { QueueHealthIndicator } from './queue.health';
import { QueueService } from './queue.service';
import { HealthIndicatorService } from '@nestjs/terminus';
import { PinoLogger } from 'nestjs-pino';
import { QueueStats } from './queue.types';
import { HealthIndicatorSession } from '@nestjs/terminus/dist/health-indicator/health-indicator.service';

describe('QueueHealthIndicator', () => {
  let indicator: QueueHealthIndicator;
  let mockQueueService: jest.Mocked<QueueService>;
  let mockHealthIndicatorService: jest.Mocked<HealthIndicatorService>;
  let mockLogger: jest.Mocked<PinoLogger>;
  let mockIndicator: any;

  beforeEach(async () => {
    mockQueueService = {
      registerQueue: jest.fn(),
      addJob: jest.fn(),
      getQueueStats: jest.fn(),
      pauseQueue: jest.fn(),
      resumeQueue: jest.fn(),
    } as unknown as jest.Mocked<QueueService>;

    mockHealthIndicatorService = {
      check: jest.fn(),
    };

    mockLogger = {
      error: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>;

    mockIndicator = {
      up: jest.fn().mockImplementation((data) => ({
        status: 'up',
        ...data,
      })),
      down: jest.fn().mockImplementation((data) => ({
        status: 'down',
        ...data,
      })),
    } as unknown as HealthIndicatorSession;
    mockHealthIndicatorService.check.mockReturnValue(mockIndicator);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueHealthIndicator,
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: HealthIndicatorService,
          useValue: mockHealthIndicatorService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    indicator = module.get<QueueHealthIndicator>(QueueHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isHealthy', () => {
    const mockQueueStats = {
      active: 5,
      waiting: 3,
      completed: 10,
      failed: 2,
      delayed: 1,
      paused: 0,
    };

    describe('when all queues are healthy', () => {
      it('should return healthy status for all queues', async () => {
        const queueNames = ['queue1', 'queue2'];
        mockQueueService.getQueueStats.mockResolvedValueOnce(mockQueueStats).mockResolvedValueOnce(mockQueueStats);

        const result = await indicator.isHealthy(queueNames);

        expect(mockHealthIndicatorService.check.mock.calls[0][0]).toBe('queue');
        expect(mockQueueService.getQueueStats.mock.calls).toHaveLength(2);
        expect(mockQueueService.getQueueStats.mock.calls[0][0]).toBe('queue1');
        expect(mockQueueService.getQueueStats.mock.calls[1][0]).toBe('queue2');
        expect(mockIndicator.up).toHaveBeenCalledWith({
          latency: expect.stringMatching(/\d+ms/),
          queues: {
            queue1: {
              status: 'up',
              ...mockQueueStats,
            },
            queue2: {
              status: 'up',
              ...mockQueueStats,
            },
          },
          timestamp: expect.any(String),
        });
        expect(result).toEqual({
          status: 'up',
          latency: expect.stringMatching(/\d+ms/),
          queues: {
            queue1: {
              status: 'up',
              ...mockQueueStats,
            },
            queue2: {
              status: 'up',
              ...mockQueueStats,
            },
          },
          timestamp: expect.any(String),
        });
      });

      it('should use default key when not provided', async () => {
        const queueNames = ['queue1'];
        mockQueueService.getQueueStats.mockResolvedValue(mockQueueStats);

        await indicator.isHealthy(queueNames);

        expect(mockHealthIndicatorService.check.mock.calls[0][0]).toBe('queue');
      });

      it('should use custom key when provided', async () => {
        const queueNames = ['queue1'];
        const customKey = 'custom-queue';
        mockQueueService.getQueueStats.mockResolvedValue(mockQueueStats);

        await indicator.isHealthy(queueNames, customKey);

        expect(mockHealthIndicatorService.check.mock.calls[0][0]).toBe(customKey);
      });
    });

    describe('when some queues have high failure count', () => {
      it('should return unhealthy status with warning', async () => {
        const queueNames = ['queue1', 'queue2'];
        const highFailedStats: QueueStats = {
          ...mockQueueStats,
          failed: 15, // High failure count
        };

        mockQueueService.getQueueStats.mockResolvedValueOnce(mockQueueStats).mockResolvedValueOnce(highFailedStats);

        const result = await indicator.isHealthy(queueNames);

        expect(mockIndicator.down).toHaveBeenCalledWith({
          latency: expect.stringMatching(/\d+ms/),
          queues: {
            queue1: {
              status: 'up',
              ...mockQueueStats,
            },
            queue2: {
              status: 'up',
              ...highFailedStats,
              warning: 'High failed job count',
              failedThreshold: 10,
            },
          },
          timestamp: expect.any(String),
        });
        expect(result).toEqual({
          status: 'down',
          latency: expect.stringMatching(/\d+ms/),
          queues: {
            queue1: {
              status: 'up',
              ...mockQueueStats,
            },
            queue2: {
              status: 'up',
              ...highFailedStats,
              warning: 'High failed job count',
              failedThreshold: 10,
            },
          },
          timestamp: expect.any(String),
        });
      });
    });

    describe('when some queues fail health check', () => {
      it('should return unhealthy status with error details', async () => {
        const queueNames = ['queue1', 'queue2'];
        const error = new Error('Connection failed');

        mockQueueService.getQueueStats.mockResolvedValueOnce(mockQueueStats).mockRejectedValueOnce(error);

        const result = await indicator.isHealthy(queueNames);

        expect(mockLogger.error.mock.calls[0][0]).toEqual({ queue: 'queue2', error: error.message });
        expect(mockLogger.error.mock.calls[0][1]).toBe('Queue health check failed');
        expect(mockIndicator.down).toHaveBeenCalledWith({
          latency: expect.stringMatching(/\d+ms/),
          queues: {
            queue1: {
              status: 'up',
              ...mockQueueStats,
            },
            queue2: {
              status: 'down',
              error: 'Connection failed',
              timestamp: expect.any(String),
            },
          },
          timestamp: expect.any(String),
        });
        expect(result).toEqual({
          status: 'down',
          latency: expect.stringMatching(/\d+ms/),
          queues: {
            queue1: {
              status: 'up',
              ...mockQueueStats,
            },
            queue2: {
              status: 'down',
              error: 'Connection failed',
              timestamp: expect.any(String),
            },
          },
          timestamp: expect.any(String),
        });
      });

      it('should handle unknown errors', async () => {
        const queueNames = ['queue1'];
        mockQueueService.getQueueStats.mockRejectedValue('Unknown error');

        await indicator.isHealthy(queueNames);

        expect(mockIndicator.down).toHaveBeenCalledWith({
          latency: expect.stringMatching(/\d+ms/),
          queues: {
            queue1: {
              status: 'down',
              error: 'Unknown error',
              timestamp: expect.any(String),
            },
          },
          timestamp: expect.any(String),
        });
      });
    });

    describe('when health check itself fails', () => {
      it('should return unhealthy status with error', async () => {
        const queueNames = ['queue1'];
        const error = new Error('Health check failed');
        mockQueueService.getQueueStats.mockImplementation(() => {
          throw error;
        });

        const result = await indicator.isHealthy(queueNames);

        const mockCall = mockIndicator.down.mock.calls[0][0];
        expect(mockCall).toMatchObject({
          queues: {
            queue1: {
              status: 'down',
              error: 'Health check failed',
              timestamp: expect.any(String),
            },
          },
          latency: expect.stringMatching(/\d+ms/),
          timestamp: expect.any(String),
        });
        expect(result).toMatchObject({
          status: 'down',
          queues: {
            queue1: {
              status: 'down',
              error: 'Health check failed',
              timestamp: expect.any(String),
            },
          },
          latency: expect.stringMatching(/\d+ms/),
          timestamp: expect.any(String),
        });
      });

      it('should handle unknown errors in health check', async () => {
        const queueNames = ['queue1'];
        mockQueueService.getQueueStats.mockImplementation(() => {
          throw new Error('Unknown error');
        });

        await indicator.isHealthy(queueNames);

        const mockCall = mockIndicator.down.mock.calls[0][0];
        expect(mockCall).toMatchObject({
          queues: {
            queue1: {
              status: 'down',
              error: 'Unknown error',
              timestamp: expect.any(String),
            },
          },
          latency: expect.stringMatching(/\d+ms/),
          timestamp: expect.any(String),
        });
      });
    });

    describe('latency measurement', () => {
      it('should measure latency correctly', async () => {
        const queueNames = ['queue1'];
        mockQueueService.getQueueStats.mockResolvedValue(mockQueueStats);

        // Mock Date.now to control timing
        const originalDateNow = Date.now;
        let callCount = 0;
        Date.now = jest.fn(() => {
          callCount++;
          if (callCount === 1) return 1000; // Start time
          return 1050; // End time (50ms later)
        });

        await indicator.isHealthy(queueNames);

        expect(mockIndicator.up).toHaveBeenCalledWith({
          latency: '50ms',
          queues: {
            queue1: {
              status: 'up',
              ...mockQueueStats,
            },
          },
          timestamp: expect.any(String),
        });

        // Restore original Date.now
        Date.now = originalDateNow;
      });
    });

    describe('empty queue list', () => {
      it('should handle empty queue list', async () => {
        const queueNames: string[] = [];

        const result = await indicator.isHealthy(queueNames);

        expect(mockIndicator.up).toHaveBeenCalledWith({
          latency: expect.stringMatching(/\d+ms/),
          queues: {},
          timestamp: expect.any(String),
        });
        expect(result).toEqual({
          status: 'up',
          latency: expect.stringMatching(/\d+ms/),
          queues: {},
          timestamp: expect.any(String),
        });
      });
    });

    describe('mixed queue statuses', () => {
      it('should handle mixed healthy and unhealthy queues', async () => {
        const queueNames = ['healthy-queue', 'failed-queue', 'high-failed-queue'];
        const highFailedStats: QueueStats = {
          ...mockQueueStats,
          failed: 20,
        };

        mockQueueService.getQueueStats
          .mockResolvedValueOnce(mockQueueStats) // healthy
          .mockRejectedValueOnce(new Error('Connection failed')) // failed
          .mockResolvedValueOnce(highFailedStats); // high failed

        await indicator.isHealthy(queueNames);

        expect(mockIndicator.down).toHaveBeenCalledWith({
          latency: expect.stringMatching(/\d+ms/),
          queues: {
            'healthy-queue': {
              status: 'up',
              ...mockQueueStats,
            },
            'failed-queue': {
              status: 'down',
              error: 'Connection failed',
              timestamp: expect.any(String),
            },
            'high-failed-queue': {
              status: 'up',
              ...highFailedStats,
              warning: 'High failed job count',
              failedThreshold: 10,
            },
          },
          timestamp: expect.any(String),
        });
      });
    });
  });
});
