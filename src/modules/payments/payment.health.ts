import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { PinoLogger } from 'nestjs-pino';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PaymentService } from './payment.service';
import { PAYMENT_QUEUE } from './payment.constant';
import { WebhookJobData } from './interfaces/xendit-webhook.interface';

@Injectable()
export class PaymentHealthIndicator {
  constructor(
    private readonly logger: PinoLogger,
    private readonly paymentService: PaymentService,
    private readonly healthIndicatorService: HealthIndicatorService,
    @InjectQueue(PAYMENT_QUEUE)
    private readonly paymentQueue: Queue<WebhookJobData>,
  ) {}

  async isHealthy(key: string = 'xendit') {
    const indicator = this.healthIndicatorService.check(key);
    const startTime = Date.now();

    try {
      const [dbAlive, queueCounts] = await Promise.all([this.paymentService.ping(), this.paymentQueue.getJobCounts()]);

      const latency = Date.now() - startTime;

      if (dbAlive) {
        return indicator.up({
          latency: `${latency}ms`,
          connected: true,
          queue: {
            waiting: queueCounts.waiting,
            active: queueCounts.active,
            failed: queueCounts.failed,
          },
        });
      }

      return indicator.down({
        latency: `${latency}ms`,
        connected: false,
        error: 'Payment DB check failed',
      });
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error({ error }, 'Payment health check failed');
      return indicator.down({
        latency: `${latency}ms`,
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }
}
