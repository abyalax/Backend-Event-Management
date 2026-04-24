import { JobsOptions, QueueOptions, WorkerOptions } from 'bullmq';

export enum QueueStatus {
  ACTIVE = 'active',
  WAITING = 'waiting',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
}

export enum QueuePriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 15,
}

export interface QueueJobData<T = unknown> {
  data: T;
  priority?: QueuePriority;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
  timeout?: number;
}

export interface QueueJobConfig<T = unknown> {
  name: string;
  handler: (data: T) => Promise<void>;
  defaultOptions?: JobsOptions;
  concurrency?: number;
  priority?: QueuePriority;
}

export interface QueueConfig {
  name: string;
  prefix?: string;
  defaultJobOptions?: JobsOptions;
  settings?: {
    stalledInterval?: number;
    maxStalledCount?: number;
  };
}

export interface QueueStats {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface QueueHealthStatus {
  status: 'up' | 'down';
  latency: string;
  queues?: Record<string, QueueStats | { status: 'up' | 'down'; error?: string }>;
  error?: string;
}

export interface QueueMetrics {
  queueName: string;
  timestamp: Date;
  stats: QueueStats;
  throughput: number;
  avgProcessingTime: number;
}

export interface QueueEvent {
  type: 'completed' | 'failed' | 'progress' | 'stalled';
  jobId: string;
  queueName: string;
  timestamp: Date;
  data?: unknown;
  error?: string;
}

export interface QueueWorkerOptions extends WorkerOptions {
  concurrency?: number;
  maxStalledCount?: number;
  stalledInterval?: number;
}

export interface QueueManagerOptions {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultConcurrency?: number;
  defaultJobOptions?: JobsOptions;
  healthCheck?: {
    interval?: number;
    timeout?: number;
  };
}
