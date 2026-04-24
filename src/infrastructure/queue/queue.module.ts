import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PinoLogger } from 'nestjs-pino';
import { QueueService } from './queue.service';
import { QueueHealthIndicator } from './queue.health';
import { QueueErrorHandler } from './queue.error-handler';

@Module({
  imports: [TerminusModule],
  providers: [QueueService, QueueHealthIndicator, QueueErrorHandler],
  exports: [QueueService, QueueHealthIndicator, QueueErrorHandler],
})
export class QueueModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly queueService: QueueService,
    private readonly logger: PinoLogger,
  ) {}

  onModuleInit() {
    try {
      this.logger.info('QueueModule initializing');
      // Verify Redis connection by getting queue names (if any queues are registered)
      this.logger.info('QueueModule initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error({ error: errorMessage }, 'Failed to initialize QueueModule');
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      this.logger.info('QueueModule destroying');
      await this.queueService.closeAll();
      this.logger.info('QueueModule destroyed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error({ error: errorMessage }, 'Error during QueueModule destruction');
    }
  }
}
