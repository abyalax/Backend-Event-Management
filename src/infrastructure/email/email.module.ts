import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TerminusModule } from '@nestjs/terminus';
import { EmailService } from './email.service';
import { MailPitHealthIndicator } from './email.health';
import { LoggerModule } from '~/common/logger/logger.module';
import { DatabaseModule } from '../database/database.module';
import { emailProvider } from './email.provider';

@Module({
  imports: [TerminusModule, BullModule.registerQueue({ name: 'email' }), LoggerModule, DatabaseModule],
  providers: emailProvider,
  exports: [EmailService, MailPitHealthIndicator],
})
export class EmailModule {}
