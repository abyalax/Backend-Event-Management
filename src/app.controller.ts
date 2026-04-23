import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { AppService } from './app.service';
import { StorageHealthIndicator } from './infrastructure/storage/indicators/health.indicator';
import { MailPitHealthIndicator } from './infrastructure/email/indicators/health.indicator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly health: HealthCheckService,
    private readonly storageHealthIndicator: StorageHealthIndicator,
    private readonly mailPitHealthIndicator: MailPitHealthIndicator,
  ) {}

  @Get('/health')
  @HealthCheck()
  async check() {
    return this.health.check([() => this.storageHealthIndicator.isHealthy('storage'), () => this.mailPitHealthIndicator.isHealthy('mailpit')]);
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
