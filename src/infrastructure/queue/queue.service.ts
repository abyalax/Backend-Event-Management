import { Injectable, OnModuleDestroy, Inject } from '@nestjs/common';
import { Queue, Worker, QueueOptions, WorkerOptions, JobsOptions } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import Redis from 'ioredis';
import { ConfigService, CONFIG_SERVICE } from '../config/config.provider';
import { QUEUE_DEFAULTS } from './queue.constants';

export interface JobConfig<T = unknown> {
  name: string;
  handler: (data: T) => Promise<void>;
  options?: {
    attempts?: number;
    backoff?: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete?: boolean;
    removeOnFail?: boolean;
    timeout?: number;
  };
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly queues = new Map<string, Queue>();
  private readonly workers = new Map<string, Worker>();
  private readonly connection: Redis;
  private isShuttingDown = false;

  constructor(
    @Inject(CONFIG_SERVICE) private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.connection = new Redis({
      host: this.config.get('REDIS_HOST'),
      port: this.config.get('REDIS_PORT'),
      password: this.config.get('REDIS_PASSWORD'),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.connection.on('error', (error) => {
      this.logger.error({ error }, 'Redis connection error');
    });

    this.connection.on('connect', () => {
      this.logger.info('Redis connection established');
    });
  }

  registerQueue(queueName: string, jobConfigs: JobConfig[]) {
    if (this.isShuttingDown) {
      this.logger.warn({ queue: queueName }, 'Cannot register queue during shutdown');
      throw new Error('Queue service is shutting down');
    }

    if (this.queues.has(queueName)) {
      this.logger.warn({ queue: queueName }, 'Queue already registered');
      return;
    }

    const queueOptions: QueueOptions = {
      connection: this.connection,
      defaultJobOptions: {
        attempts: QUEUE_DEFAULTS.ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: QUEUE_DEFAULTS.BACKOFF_DELAY,
        },
        removeOnComplete: QUEUE_DEFAULTS.REMOVE_ON_COMPLETE,
        removeOnFail: QUEUE_DEFAULTS.REMOVE_ON_FAIL,
      },
    };

    const queue = new Queue(queueName, queueOptions);
    this.queues.set(queueName, queue);

    jobConfigs.forEach((config) => {
      const workerOptions: WorkerOptions = {
        connection: this.connection,
        concurrency: this.config.get('QUEUE_CONCURRENCY') || QUEUE_DEFAULTS.CONCURRENCY,
      };

      const worker = new Worker(
        queueName,
        async (job) => {
          try {
            this.logger.info({ jobName: config.name, jobId: job.id, queue: queueName }, 'Job started');

            const startTime = Date.now();
            await config.handler(job.data);
            const duration = Date.now() - startTime;

            this.logger.info({ jobName: config.name, jobId: job.id, queue: queueName, duration }, 'Job completed');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const stack = error instanceof Error ? error.stack : undefined;

            this.logger.error(
              {
                jobName: config.name,
                jobId: job.id,
                queue: queueName,
                error: errorMessage,
                stack,
                attempt: job.attemptsMade,
                maxAttempts: job.opts.attempts,
              },
              'Job failed',
            );
            throw error;
          }
        },
        workerOptions,
      );

      worker.on('completed', (job) => {
        this.logger.debug({ jobId: job.id, queue: queueName }, 'Job completed event');
      });

      worker.on('failed', (job, err) => {
        this.logger.error(
          {
            jobId: job?.id,
            queue: queueName,
            error: err.message,
            attempt: job?.attemptsMade,
          },
          'Worker failed event',
        );
      });

      worker.on('stalled', (jobId) => {
        this.logger.warn({ jobId, queue: queueName }, 'Job stalled');
      });

      worker.on('error', (err) => {
        this.logger.error({ queue: queueName, error: err }, 'Worker error');
      });

      this.workers.set(`${queueName}:${config.name}`, worker);
    });

    this.logger.info({ queue: queueName, jobs: jobConfigs.length }, 'Queue registered');
  }

  async addJob<T = unknown>(queueName: string, jobName: string, data: T, opts?: JobsOptions) {
    if (this.isShuttingDown) throw new Error('Cannot add job during shutdown');

    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    try {
      const job = await queue.add(jobName, data, opts);
      this.logger.debug({ queue: queueName, jobName, jobId: job.id, data }, 'Job added');
      return job;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error({ queue: queueName, jobName, error: errorMessage }, 'Failed to add job');
      throw error;
    }
  }

  async getQueueStats(queueName: string) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);

    try {
      const [active, waiting, completed, failed, delayed] = await Promise.all([
        queue.getActiveCount(),
        queue.getWaitingCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      return {
        active,
        waiting,
        completed,
        failed,
        delayed,
        paused: 0,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error({ queue: queueName, error: errorMessage }, 'Failed to get queue stats');
      throw error;
    }
  }

  async pauseQueue(queueName: string) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    try {
      await queue.pause();
      this.logger.info({ queue: queueName }, 'Queue paused');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error({ queue: queueName, error: errorMessage }, 'Failed to pause queue');
      throw error;
    }
  }

  async resumeQueue(queueName: string) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    try {
      await queue.resume();
      this.logger.info({ queue: queueName }, 'Queue resumed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error({ queue: queueName, error: errorMessage }, 'Failed to resume queue');
      throw error;
    }
  }

  async closeAll() {
    if (this.isShuttingDown) {
      this.logger.warn('Already shutting down');
      return;
    }

    this.isShuttingDown = true;
    this.logger.info('Starting queue service shutdown');

    if (process.env.NODE_ENV === 'test') {
      for (const worker of this.workers.values()) {
        void worker.close().catch((error) => {
          this.logger.error({ error }, 'Error closing worker');
        });
      }

      for (const queue of this.queues.values()) {
        void queue.close().catch((error) => {
          this.logger.error({ error }, 'Error closing queue');
        });
      }

      void this.connection.quit().catch((error) => {
        this.logger.error({ error }, 'Error closing Redis connection');
        this.connection.disconnect?.();
      });

      this.queues.clear();
      this.workers.clear();

      this.logger.info('All queues and workers closed successfully');
      return;
    }

    try {
      const workerClosePromises = Array.from(this.workers.values()).map((worker) =>
        worker.close().catch((error) => {
          this.logger.error({ error }, 'Error closing worker');
        }),
      );

      await Promise.all(workerClosePromises);

      const queueClosePromises = Array.from(this.queues.values()).map((queue) =>
        queue.close().catch((error) => {
          this.logger.error({ error }, 'Error closing queue');
        }),
      );

      await Promise.all(queueClosePromises);

      await this.connection.quit();

      this.queues.clear();
      this.workers.clear();

      this.logger.info('All queues and workers closed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error({ error: errorMessage }, 'Error during shutdown');
      throw error;
    }
  }

  async drainQueue(queueName: string) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    try {
      await queue.drain();
      this.logger.info({ queue: queueName }, 'Queue drained');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error({ queue: queueName, error: errorMessage }, 'Failed to drain queue');
      throw error;
    }
  }

  async removeJob(queueName: string, jobId: string) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    try {
      const job = await queue.getJob(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      await job.remove();
      this.logger.info({ queue: queueName, jobId }, 'Job removed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error({ queue: queueName, jobId, error: errorMessage }, 'Failed to remove job');
      throw error;
    }
  }

  getQueue(queueName: string) {
    return this.queues.get(queueName);
  }

  getWorker(key: string) {
    return this.workers.get(key);
  }

  getQueueNames() {
    return Array.from(this.queues.keys());
  }

  onModuleDestroy() {
    return this.closeAll();
  }
}
