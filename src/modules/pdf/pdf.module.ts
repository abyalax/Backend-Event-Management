import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PdfService } from './pdf.service';
import { QrModule } from '../qr-code/qr-code.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { EmailModule } from '~/infrastructure/email/email.module';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { LoggerModule } from '~/common/logger/logger.module';
import { pdfProviders } from './pdf.providers';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'pdf' }),
    BullModule.registerQueue({ name: 'email' }),
    QrModule,
    StorageModule,
    EmailModule,
    DatabaseModule,
    LoggerModule,
  ],
  providers: pdfProviders,
  exports: [PdfService],
})
export class PdfModule {}
