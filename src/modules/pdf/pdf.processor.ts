import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PdfService } from './pdf.service';
import { PinoLogger } from 'nestjs-pino';

@Processor('pdf')
export class PdfProcessor extends WorkerHost {
  constructor(
    private readonly logger: PinoLogger,
    private readonly pdfService: PdfService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'generate-ticket-pdf') {
      const { ticketId } = job.data as { ticketId: string };
      this.logger.info(`Processing generate-ticket-pdf job for ticketId: ${ticketId}, jobId: ${job.id}`);
      await this.pdfService.generateAndStore(ticketId);
    }
  }
}
