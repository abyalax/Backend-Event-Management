import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { QueueService } from './queue.service';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class QueueHealthIndicator {
  constructor(
    private readonly queueService: QueueService,
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly logger: PinoLogger,
  ) {}

  async isHealthy(queueNames: string[], key: string = 'queue') {
    const indicator = this.healthIndicatorService.check(key);
    const startTime = Date.now();
    const results: Record<string, { status: 'up' | 'down' } & Record<string, unknown>> = {};
    let isHealthy = true;

    try {
      const healthCheckPromises = queueNames.map(async (queueName) => {
        try {
          const stats = await this.queueService.getQueueStats(queueName);

          results[queueName] = {
            status: 'up' as const,
            ...stats,
          };

          if (stats.failed > 10) {
            isHealthy = false;
            (results[queueName] as { status: 'up'; warning: string }).warning = 'High failed job count';
            (results[queueName] as { status: 'up'; failedThreshold: number }).failedThreshold = 10;
          }

          if (stats.active === 0 && stats.waiting === 0 && stats.delayed === 0) {
            (results[queueName] as { status: 'up'; idle: boolean }).idle = true;
          }
        } catch (error) {
          isHealthy = false;
          const errorMessage = error instanceof Error ? error.message : String(error);
          results[queueName] = {
            status: 'down',
            error: errorMessage,
            timestamp: new Date().toISOString(),
          };
          this.logger.error({ queue: queueName, error: errorMessage }, 'Queue health check failed');
        }
      });

      await Promise.allSettled(healthCheckPromises);

      const latency = Date.now() - startTime;

      if (isHealthy) {
        return indicator.up({
          latency: `${latency}ms`,
          queues: results,
          timestamp: new Date().toISOString(),
        });
      } else {
        return indicator.down({
          latency: `${latency}ms`,
          queues: results,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error({ error: errorMessage, latency }, 'Health check exception');

      return indicator.down({
        latency: `${latency}ms`,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
