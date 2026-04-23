import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { EmailService } from '../email.service';

/**
 * MailPit Health Indicator untuk NestJS Terminus
 *
 * Integration dengan NestJS health check system
 * Memungkinkan monitoring MailPit/SMTP status sebagai bagian dari overall application health
 *
 * Usage dalam health check module:
 * @Module({
 *   imports: [TerminusModule],
 *   providers: [MailPitHealthIndicator],
 *   controllers: [HealthController]
 * })
 *
 * Dalam controller:
 * @Get('health')
 * @HealthCheck()
 * check() {
 *   return this.health.check([
 *     () => this.mailPitHealth.isHealthy('mailpit'),
 *   ]);
 * }
 */
@Injectable()
export class MailPitHealthIndicator {
  constructor(
    private readonly emailService: EmailService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  /**
   * Check MailPit/SMTP health
   * @param key - Indicator key (default: 'mailpit')
   * @returns Health check result
   */
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
