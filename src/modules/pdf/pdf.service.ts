import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { QRService } from '~/modules/qr-code/qr-code.service';
import { Ticket } from '../tickets/entities/ticket.entity';
import { REPOSITORY } from '~/common/constants/database';
import { StorageService } from '~/infrastructure/storage/storage.service';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { GeneratedEventTicket } from '~/modules/tickets/entities/generated-event-ticket.entity';
import { EmailService } from '~/infrastructure/email/email.service';

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
    private readonly emailService: EmailService,
    @Inject(CONFIG_SERVICE)
    private readonly configService: ConfigService,
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

    const pdfUrl = await this.storeGeneratedTicketPdf(ticketId, pdfBuffer);

    await this.ticketRepo.update(ticketId, { pdfUrl });
    this.logger.info({ ticketId, pdfUrl }, 'PDF generated and stored');

    await this.emailQueue.add('send-ticket-email', { ticketId });
    this.logger.info({ ticketId }, 'send-ticket-email job enqueued');
  }

  generateTicketQrPayload(ticketId: string, eventId: string): Promise<string> {
    return this.qrService.generate(ticketId, eventId);
  }

  async generateGeneratedTicketPdf(generatedTicket: GeneratedEventTicket, ticket: Ticket, qrPayload: string): Promise<Buffer> {
    try {
      const qrBuffer = await QRCode.toBuffer(qrPayload, {
        type: 'png',
        width: 150,
        margin: 1,
      });

      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, compress: false });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (error: Error) => reject(error instanceof Error ? error : new Error(String(error))));

        doc.fontSize(24).text(ticket.event?.title || 'Event Ticket', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Date: ${ticket.event?.startDate?.toISOString() || 'TBD'}`, { align: 'center' });
        doc.text(`Location: ${ticket.event?.location || 'TBD'}`, { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(14).text(`Ticket ID: ${generatedTicket.id}`);
        doc.text(`Order Item ID: ${generatedTicket.orderItemId}`);
        doc.text(`Ticket Type: ${ticket.name}`);
        doc.moveDown(1);

        doc.image(qrBuffer, { width: 150, align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(1).fillColor('white').text(`CHECKIN_QR:${qrPayload}`, { align: 'center' });

        doc.end();
      });
    } catch (error) {
      throw new Error(`Failed to generate ticket PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async storeGeneratedTicketPdf(ticketId: string, pdfBuffer: Buffer): Promise<string> {
    const bucket = this.configService.get('STORAGE_BUCKET_TICKETS_PUBLIC');
    const uploadResult = await this.storageService.uploadFile({
      bucket,
      file: pdfBuffer,
      metadata: {
        originalname: `${ticketId}.pdf`,
        mimetype: 'application/pdf',
      },
    });

    if (!uploadResult.success) {
      const errorMessage = uploadResult.error || 'Unknown upload error';
      this.logger.error({ ticketId, error: errorMessage }, 'Storage upload failed');
      throw new Error(`Storage upload failed: ${errorMessage}`);
    }

    if (!uploadResult.filename) {
      throw new Error('Upload succeeded but no filename returned');
    }

    const baseUrl = this.configService.get('URL_API');
    const pdfUrl = `${baseUrl}/storage/download/${bucket}/${uploadResult.filename}`;
    this.logger.info({ ticketId, filename: uploadResult.filename }, 'PDF stored successfully');
    return pdfUrl;
  }

  async sendGeneratedTicketsEmail(to: string, orderId: string, tickets: GeneratedEventTicket[]): Promise<void> {
    try {
      await this.emailService.sendEmail({
        to,
        subject: `Your Tickets - Order ${orderId}`,
        html: this.buildTicketEmailHtml(orderId, tickets),
      });

      this.logger.info({ to, orderId, ticketCount: tickets.length }, 'Ticket email sent successfully');
    } catch (error) {
      this.logger.error({ to, orderId, error }, 'Failed to send ticket email');
    }
  }

  private buildTicketEmailHtml(orderId: string, tickets: GeneratedEventTicket[]): string {
    const ticketLinks = tickets.map((ticket) => `<li>Ticket ID: ${ticket.id} - <a href="${ticket.pdfUrl}">Download PDF</a></li>`).join('');

    return `
      <h2>Your Tickets Are Ready!</h2>
      <p>Thank you for your purchase. Your tickets for order ${orderId} are now available.</p>
      <h3>Ticket Details:</h3>
      <ul>
        ${ticketLinks}
      </ul>
      <p>Please present these tickets at the event entrance.</p>
      <p>Best regards,<br>Event Management Team</p>
    `;
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
