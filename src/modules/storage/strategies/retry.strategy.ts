import { Inject, Injectable, Logger } from '@nestjs/common';

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDurationMs: number;
}

/**
 * Retry Strategy dengan exponential backoff
 *
 * Strategy:
 * - Exponential backoff: delay = min(initialDelay * 2^attempts, maxDelay)
 * - Jitter: Add random jitter untuk prevent thundering herd
 * - Circuit breaker: Stop retrying setelah maxAttempts
 *
 * Contoh usage:
 * const result = await this.retryStrategy.execute(
 *   async () => await minioClient.putObject(...),
 *   'Upload file'
 * );
 */
@Injectable()
export class RetryStrategy {
  private readonly logger = new Logger('RetryStrategy');
  private readonly config: RetryConfig;

  constructor(@Inject('STORAGE_CONFIG') private readonly storageConfig: any) {
    this.config = {
      maxAttempts: storageConfig.retry?.maxAttempts || 3,
      initialDelayMs: storageConfig.retry?.initialDelayMs || 100,
      maxDelayMs: storageConfig.retry?.maxDelayMs || 5000,
    };
  }

  /**
   * Execute function dengan automatic retry dan exponential backoff
   *
   * @param fn - Function yang akan diexecute
   * @param operationName - Nama operasi untuk logging
   * @returns Result object dengan data, error, attempts, duration
   */
  async execute<T>(fn: () => Promise<T>, operationName: string = 'Operation'): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < this.config.maxAttempts) {
      attempt++;

      try {
        const data = await fn();

        const duration = Date.now() - startTime;
        this.logger.debug(`${operationName} succeeded on attempt ${attempt} (${duration}ms)`);

        return {
          success: true,
          data,
          attempts: attempt,
          totalDurationMs: duration,
        };
      } catch (error) {
        lastError = error;

        if (attempt < this.config.maxAttempts) {
          const delayMs = this.calculateBackoffDelay(attempt);
          this.logger.warn(
            `${operationName} failed on attempt ${attempt}/${this.config.maxAttempts}. ` + `Retrying in ${delayMs}ms...`,
            error.message,
          );

          await this.delay(delayMs);
        } else {
          this.logger.error(`${operationName} failed after ${attempt} attempts`, error);
        }
      }
    }

    const duration = Date.now() - startTime;
    return {
      success: false,
      error: lastError,
      attempts: attempt,
      totalDurationMs: duration,
    };
  }

  /**
   * Execute function dengan timeout
   */
  async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number = 30000, operationName: string = 'Operation'): Promise<RetryResult<T>> {
    return Promise.race([
      this.execute(fn, operationName),
      new Promise<RetryResult<T>>((_, reject) => setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs)),
    ]).catch((error) => ({
      success: false,
      error,
      attempts: 0,
      totalDurationMs: timeoutMs,
    }));
  }

  /**
   * Calculate exponential backoff delay dengan jitter
   *
   * Formula:
   * base_delay = min(initialDelay * 2^(attempt-1), maxDelay)
   * jitter = random(0, base_delay * 0.1)
   * final_delay = base_delay + jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.config.initialDelayMs * Math.pow(2, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelayMs);

    // Add jitter untuk prevent thundering herd
    const jitter = Math.random() * cappedDelay * 0.1;

    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Sleep untuk specified duration
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current retry configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Update retry configuration
   * (Useful untuk testing atau dynamic adjustment)
   */
  updateConfig(config: Partial<RetryConfig>): void {
    Object.assign(this.config, config);
    this.logger.debug('Retry configuration updated', this.config);
  }

  /**
   * Batch execute dengan retry
   * Useful untuk bulk operations
   */
  async executeBatch<T>(operations: Array<{ fn: () => Promise<T>; name: string }>, continueOnError: boolean = false): Promise<Array<RetryResult<T>>> {
    const results: Array<RetryResult<T>> = [];

    for (const operation of operations) {
      try {
        const result = await this.execute(operation.fn, operation.name);
        results.push(result);

        if (!result.success && !continueOnError) {
          break;
        }
      } catch (error) {
        results.push({
          success: false,
          error: error as Error,
          attempts: 0,
          totalDurationMs: 0,
        });

        if (!continueOnError) {
          break;
        }
      }
    }

    return results;
  }
}
