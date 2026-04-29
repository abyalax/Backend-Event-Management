import { DataSource } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PostgreeConnection } from '~/infrastructure/database/database.provider';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Provider } from '@nestjs/common';
import { PdfProcessor } from './pdf.processor';
import { PdfService } from './pdf.service';

export const pdfProviders: Provider[] = [
  PdfService,
  PdfProcessor,
  {
    provide: REPOSITORY.TICKET,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Ticket),
    inject: [PostgreeConnection.provide],
  },
];
