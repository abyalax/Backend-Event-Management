import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import * as PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
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

    const qrPayload: string = await this.qrService.generate(ticket.id, ticket.eventId);

    const pdfBuffer = await this.buildPdf(ticket, qrPayload);

    const uploadResult = await this.storageService.uploadFile({
      bucket: 'tickets-public',
      file: pdfBuffer,
      metadata: {
        originalname: `${ticketId}.pdf`,
        mimetype: 'application/pdf',
      },
    });

    // Check if upload was successful
    if (!uploadResult.success) {
      const errorMessage = uploadResult.error || 'Unknown upload error';
      this.logger.error({ ticketId, error: errorMessage }, 'Storage upload failed');
      throw new Error(`Storage upload failed: ${errorMessage}`);
    }

    // Generate proper download URL
    const pdfUrl = uploadResult.filename ? `/api/storage/download/tickets-public/${uploadResult.filename}` : uploadResult.url;

    await this.ticketRepo.update(ticketId, { pdfUrl });
    this.logger.info({ ticketId, pdfUrl }, 'PDF generated and stored');

    await this.emailQueue.add('send-ticket-email', { ticketId });
    this.logger.info({ ticketId }, 'send-ticket-email job enqueued');
  }

  private async buildPdf(ticket: Ticket, qrPayload: string): Promise<Buffer> {
    try {
      // Generate QR code image from payload first
      const qrBuffer = await QRCode.toBuffer(qrPayload, {
        type: 'png',
        width: 150,
        margin: 1,
      });

      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (error) => reject(error instanceof Error ? error : new Error(String(error))));

        doc.fontSize(24).text(ticket.event.title, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Date: ${ticket.event.startDate.toISOString()}`, { align: 'center' });
        doc.text(`Location: ${ticket.event.location}`, { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(14).text(`Attendee: ${ticket.name}`);
        doc.text(`Ticket ID: ${ticket.id}`);
        doc.moveDown(1);

        doc.image(qrBuffer, { width: 150, align: 'center' });

        doc.end();
      });
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
