import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { QUEUE_DEFAULTS } from './queue.constants';

export interface QueueErrorContext {
  queueName: string;
  jobId?: string;
  jobName?: string;
  attempt?: number;
  error: Error;
  timestamp: Date;
  data?: unknown;
}

export interface RetryStrategy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay?: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export class QueueError extends Error {
  constructor(
    message: string,
    public readonly context: QueueErrorContext,
    public readonly retryable: boolean = true,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'QueueError';
    Object.setPrototypeOf(this, QueueError.prototype);
  }
}

@Injectable()
export class QueueErrorHandler {
  private readonly errorCounts = new Map<string, number>();
  private readonly lastErrorTimes = new Map<string, Date>();
  private readonly circuitBreaker = new Map<string, { state: 'closed' | 'open' | 'half-open'; openedAt: number }>();

  constructor(
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(QueueErrorHandler.name);
  }

  handleError(error: Error, context: QueueErrorContext) {
    const queueError = this.wrapError(error, context);
    const errorKey = `${context.queueName}:${context.jobName || 'unknown'}`;

    this.trackError(errorKey);
    this.logError(queueError);

    if (this.shouldRetry(queueError)) {
      this.handleRetry(queueError);
    } else {
      this.handleFatalError(queueError);
    }
  }

  private wrapError(error: Error, context: QueueErrorContext): QueueError {
    const retryable = this.isRetryableError(error);

    if (error instanceof QueueError) {
      return error;
    }

    return new QueueError(error.message, context, retryable, error);
  }

  private isRetryableError(error: Error): boolean {
    const nonRetryableErrors = [
      'ValidationError',
      'AuthenticationError',
      'AuthorizationError',
      'ForbiddenError',
      'NotFoundError',
      'ConflictError',
      'TypeError',
      'SyntaxError',
    ];

    if (nonRetryableErrors.includes(error.name)) {
      return false;
    }

    const nonRetryablePatterns = [
      /validation failed/i,
      /unauthorized/i,
      /forbidden/i,
      /not found/i,
      /conflict/i,
      /duplicate key/i,
      /unique constraint/i,
      /parse error/i,
      /syntax error/i,
      /invalid.*format/i,
    ];

    for (const pattern of nonRetryablePatterns) {
      if (pattern.test(error.message)) {
        return false;
      }
    }

    const retryablePatterns = [
      /connection/i,
      /timeout/i,
      /network/i,
      /ECONNRESET/i,
      /ETIMEDOUT/i,
      /ENOTFOUND/i,
      /ECONNREFUSED/i,
      /503/i,
      /429/i,
      /temporarily unavailable/i,
    ];

    for (const pattern of retryablePatterns) {
      if (pattern.test(error.message)) {
        return true;
      }
    }

    return true;
  }

  private trackError(errorKey: string): void {
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);
    this.lastErrorTimes.set(errorKey, new Date());

    this.cleanupOldErrors();
  }

  private cleanupOldErrors(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const [key, timestamp] of this.lastErrorTimes.entries()) {
      if (timestamp < oneHourAgo) {
        this.errorCounts.delete(key);
        this.lastErrorTimes.delete(key);
        this.circuitBreaker.delete(key);
      }
    }
  }

  private logError(error: QueueError): void {
    const logContext = {
      queueName: error.context.queueName,
      jobId: error.context.jobId,
      jobName: error.context.jobName,
      attempt: error.context.attempt,
      retryable: error.retryable,
      errorCount: this.errorCounts.get(`${error.context.queueName}:${error.context.jobName || 'unknown'}`) || 0,
      errorMessage: error.message,
      stack: error.stack,
    };

    if (error.retryable) {
      this.logger.warn(logContext, `Retryable queue error: ${error.message}`);
    } else {
      this.logger.error(logContext, `Non-retryable queue error: ${error.message}`);
    }
  }

  private shouldRetry(error: QueueError): boolean {
    if (!error.retryable) {
      return false;
    }

    const errorKey = `${error.context.queueName}:${error.context.jobName || 'unknown'}`;
    const errorCount = this.errorCounts.get(errorKey) || 0;
    const lastErrorTime = this.lastErrorTimes.get(errorKey);

    if (error.context.attempt && error.context.attempt >= QUEUE_DEFAULTS.ATTEMPTS) {
      return false;
    }

    // Circuit breaker check
    const breaker = this.circuitBreaker.get(errorKey);
    if (breaker?.state === 'open') {
      const timeSinceOpen = Date.now() - breaker.openedAt;
      if (timeSinceOpen < 60000) {
        // 1 minute
        this.logger.warn({ errorKey }, 'Circuit breaker is open');
        return false;
      } else {
        this.circuitBreaker.set(errorKey, { state: 'half-open', openedAt: Date.now() });
      }
    }

    // Error rate limiting
    if (errorCount > 10 && lastErrorTime) {
      const timeSinceLastError = Date.now() - lastErrorTime.getTime();
      if (timeSinceLastError < 60000) {
        this.logger.warn({ errorKey, errorCount, timeSinceLastError }, 'Error rate limiting triggered');
        this.circuitBreaker.set(errorKey, { state: 'open', openedAt: Date.now() });
        return false;
      }
    }

    return true;
  }

  private handleRetry(error: QueueError) {
    const strategy: RetryStrategy = {
      maxAttempts: QUEUE_DEFAULTS.ATTEMPTS,
      baseDelay: QUEUE_DEFAULTS.BACKOFF_DELAY,
      maxDelay: 300000,
      backoffMultiplier: 2,
      jitter: true,
    };

    const attempt = error.context.attempt || 1;
    const delay = this.calculateRetryDelay(strategy, attempt);

    this.logger.info(
      {
        queueName: error.context.queueName,
        jobId: error.context.jobId,
        jobName: error.context.jobName,
        attempt,
        delay,
        maxAttempts: strategy.maxAttempts,
      },
      'Scheduling retry for failed job',
    );
  }

  private calculateRetryDelay(strategy: RetryStrategy, attempt: number): number {
    let delay = strategy.baseDelay * Math.pow(strategy.backoffMultiplier, attempt - 1);

    if (strategy.maxDelay && delay > strategy.maxDelay) {
      delay = strategy.maxDelay;
    }

    if (strategy.jitter) {
      const jitterAmount = delay * 0.1;
      delay += Math.random() * jitterAmount - jitterAmount / 2;
    }

    return Math.floor(Math.max(delay, 0));
  }

  private handleFatalError(error: QueueError) {
    this.logger.error(
      {
        queueName: error.context.queueName,
        jobId: error.context.jobId,
        jobName: error.context.jobName,
        attempt: error.context.attempt,
        error: error.message,
        data: error.context.data,
      },
      'Fatal queue error - job will not be retried',
    );

    this.notifyFatalError(error);
  }

  private notifyFatalError(error: QueueError) {
    this.logger.info(
      {
        queueName: error.context.queueName,
        jobId: error.context.jobId,
        jobName: error.context.jobName,
        error: error.message,
      },
      'Fatal error notification would be sent',
    );
  }

  getErrorStats(queueName?: string): Record<string, { count: number; lastError: Date }> {
    const stats: Record<string, { count: number; lastError: Date }> = {};

    for (const [key, count] of this.errorCounts.entries()) {
      if (queueName && !key.startsWith(queueName)) {
        continue;
      }

      const lastError = this.lastErrorTimes.get(key);
      if (lastError) {
        stats[key] = { count, lastError };
      }
    }

    return stats;
  }

  resetErrorStats(queueName?: string): void {
    if (queueName) {
      const keysToDelete: string[] = [];
      for (const key of this.errorCounts.keys()) {
        if (key.startsWith(queueName + ':')) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => {
        this.errorCounts.delete(key);
        this.lastErrorTimes.delete(key);
        this.circuitBreaker.delete(key);
      });
    } else {
      this.errorCounts.clear();
      this.lastErrorTimes.clear();
      this.circuitBreaker.clear();
    }
  }

  getCircuitBreakerStatus(queueName?: string): Record<string, unknown> {
    const status: Record<string, unknown> = {};

    for (const [key, breaker] of this.circuitBreaker.entries()) {
      if (queueName && !key.startsWith(queueName)) {
        continue;
      }

      status[key] = {
        state: breaker.state,
        openedAt: new Date(breaker.openedAt),
      };
    }

    return status;
  }
}
