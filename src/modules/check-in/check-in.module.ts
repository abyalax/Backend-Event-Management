import { Module } from '@nestjs/common';
import { CheckInController } from './check-in.controller';
import { QrModule } from '../qr-code/qr-code.module';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { LoggerModule } from '~/common/logger/logger.module';
import { checkInProviders } from './check-in.providers';

@Module({
  imports: [QrModule, DatabaseModule, LoggerModule],
  controllers: [CheckInController],
  providers: checkInProviders,
})
export class CheckInModule {}
