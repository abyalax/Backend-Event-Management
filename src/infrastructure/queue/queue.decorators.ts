import { SetMetadata } from '@nestjs/common';
import { QueueJobConfig, QueuePriority as QueuePriorityLevel } from './queue.types';

export const QUEUE_JOB_METADATA_KEY = 'queue_job';
export const QUEUE_PROCESSOR_METADATA_KEY = 'queue_processor';

export interface QueueJobMetadata {
  queueName: string;
  jobName: string;
  config: QueueJobConfig;
}

export interface QueueProcessorMetadata {
  queueName: string;
  concurrency?: number;
  priority?: QueuePriorityLevel;
}

/**
 * Decorator to mark a method as a queue job processor
 * @param queueName The name of the queue
 * @param jobName The name of the job
 * @param config Job configuration options
 */
export function QueueJob(queueName: string, jobName: string, config?: Partial<QueueJobConfig>) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    const jobConfig: QueueJobConfig = {
      name: jobName,
      handler: originalMethod as (data: unknown) => Promise<void>,
      ...config,
    };

    SetMetadata(QUEUE_JOB_METADATA_KEY, {
      queueName,
      jobName,
      config: jobConfig,
    } as QueueJobMetadata)(target, propertyKey, descriptor);
  };
}

/**
 * Decorator to mark a class as a queue processor
 * @param queueName The name of the queue
 * @param options Processor options
 */
export function QueueProcessor(queueName: string, options?: { concurrency?: number; priority?: QueuePriorityLevel }) {
  return function <T extends new (...args: unknown[]) => object>(constructor: T) {
    SetMetadata(QUEUE_PROCESSOR_METADATA_KEY, {
      queueName,
      concurrency: options?.concurrency,
      priority: options?.priority,
    } as QueueProcessorMetadata)(constructor);

    return constructor;
  };
}

/**
 * Decorator to set default job options for a queue processor method
 * @param options Default job options
 */
export function QueueJobOptions(options: {
  attempts?: number;
  backoff?: { type: 'exponential' | 'fixed'; delay: number };
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
  timeout?: number;
  priority?: QueuePriorityLevel;
}) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingMetadata = Reflect.getMetadata(QUEUE_JOB_METADATA_KEY, target, propertyKey) || {};

    SetMetadata(QUEUE_JOB_METADATA_KEY, {
      ...existingMetadata,
      config: {
        ...existingMetadata.config,
        defaultOptions: options,
      },
    } as QueueJobMetadata)(target, propertyKey, descriptor);
  };
}

/**
 * Decorator to set retry configuration for a queue job
 * @param attempts Number of retry attempts
 * @param backoff Backoff strategy
 */
export function QueueRetry(attempts: number, backoff?: { type: 'exponential' | 'fixed'; delay: number }) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingMetadata = Reflect.getMetadata(QUEUE_JOB_METADATA_KEY, target, propertyKey) || {};

    SetMetadata(QUEUE_JOB_METADATA_KEY, {
      ...existingMetadata,
      config: {
        ...existingMetadata.config,
        defaultOptions: {
          ...existingMetadata.config?.defaultOptions,
          attempts,
          backoff: backoff || { type: 'exponential', delay: 2000 },
        },
      },
    } as QueueJobMetadata)(target, propertyKey, descriptor);
  };
}

/**
 * Decorator to set job priority
 * @param priority Job priority level
 */
export function QueuePriority(priority: QueuePriorityLevel) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingMetadata = Reflect.getMetadata(QUEUE_JOB_METADATA_KEY, target, propertyKey) || {};

    SetMetadata(QUEUE_JOB_METADATA_KEY, {
      ...existingMetadata,
      config: {
        ...existingMetadata.config,
        priority,
      },
    } as QueueJobMetadata)(target, propertyKey, descriptor);
  };
}
