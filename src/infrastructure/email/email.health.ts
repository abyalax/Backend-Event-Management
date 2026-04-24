import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { EmailService } from './email.service';

@Injectable()
export class MailPitHealthIndicator {
  constructor(
    private readonly emailService: EmailService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string = 'mailpit') {
    const indicator = this.healthIndicatorService.check(key);
    const startTime = Date.now();

    try {
      const isConnected = await this.emailService.verifyConnection();
      const latency = Date.now() - startTime;

      if (isConnected) {
        return indicator.up({
          latency: `${latency}ms`,
          connected: true,
        });
      } else {
        return indicator.down({
          latency: `${latency}ms`,
          connected: false,
          error: 'MailPit connection verification failed',
        });
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      return indicator.down({
        latency: `${latency}ms`,
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }
}
