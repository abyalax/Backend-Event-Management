import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { StorageHealthIndicator } from './infrastructure/storage/indicators/health.indicator';
import { MailPitHealthIndicator } from './infrastructure/email/email.health';

@Controller()
export class AppController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly storageHealthIndicator: StorageHealthIndicator,
    private readonly mailPitHealthIndicator: MailPitHealthIndicator,
  ) {}

  @Get('/health')
  @HealthCheck()
  async check() {
    return this.health.check([() => this.storageHealthIndicator.isHealthy('storage'), () => this.mailPitHealthIndicator.isHealthy('mailpit')]);
  }
}
