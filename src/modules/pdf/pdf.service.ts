import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import * as PDFDocument from 'pdfkit';
import { QRService } from '~/modules/qr-code/qr-code.service';
import { Ticket } from '../tickets/entities/ticket.entity';
import { REPOSITORY } from '~/common/constants/database';
import { StorageService } from '~/infrastructure/storage/storage.service';

@Injectable()
export class PdfService {
  constructor(
    private readonly logger: PinoLogger,

    @Inject(REPOSITORY.TICKET)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectQueue('email')
    private readonly emailQueue: Queue,
    private readonly qrService: QRService,
    private readonly storageService: StorageService,
  ) {}

  enqueue(ticketId: string) {
    // Handled by TicketService → callers should use TicketService.initiateTicketGeneration
    // This method kept for direct enqueue if needed outside the service
    this.logger.info({ ticketId }, 'Enqueuing generate-ticket-pdf');
  }

  async generateAndStore(ticketId: string): Promise<void> {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['event'],
    });

    if (!ticket) {
      this.logger.error({ ticketId }, 'Ticket not found');
      throw new BadRequestException(`Ticket ${ticketId} not found`);
    }

    if (ticket.pdfUrl) {
      this.logger.info({ ticketId }, 'PDF already exists, skipping generation');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const qrDataUrl: string = await this.qrService.generate(ticket.id, ticket.eventId);

    const pdfBuffer = await this.buildPdf(ticket, qrDataUrl);

    const uploadResult = await this.storageService.uploadFile({
      bucket: 'tickets-public',
      file: pdfBuffer,
      metadata: {
        originalname: `${ticketId}.pdf`,
        mimetype: 'application/pdf',
      },
    });
    const pdfUrl = uploadResult.url;

    await this.ticketRepo.update(ticketId, { pdfUrl });
    this.logger.info({ ticketId, pdfUrl }, 'PDF generated and stored');

    await this.emailQueue.add('send-ticket-email', { ticketId });
    this.logger.info({ ticketId }, 'send-ticket-email job enqueued');
  }

  private buildPdf(ticket: Ticket, qrDataUrl: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(24).text(ticket.event.title, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Date: ${ticket.event.startDate.toISOString()}`, { align: 'center' });
      doc.text(`Location: ${ticket.event.location}`, { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(14).text(`Attendee: ${ticket.name}`);
      doc.text(`Ticket ID: ${ticket.id}`);
      doc.moveDown(1);

      const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(qrBase64, 'base64');
      doc.image(qrBuffer, { width: 150, align: 'center' });

      doc.end();
    });
  }
}
