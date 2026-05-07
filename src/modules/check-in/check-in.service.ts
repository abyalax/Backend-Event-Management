import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { QRService } from '~/modules/qr-code/qr-code.service';
import { GeneratedEventTicket } from '~/modules/tickets/entities/generated-event-ticket.entity';
import { CheckInResponse } from './check-in.interface';

@Injectable()
export class CheckInService {
  constructor(
    @Inject(REPOSITORY.GENERATED_EVENT_TICKET)
    private readonly generatedTicketRepo: Repository<GeneratedEventTicket>,
    private readonly qrService: QRService,
    private readonly logger: PinoLogger,
  ) {}

  async validateTicket(qrCode: string): Promise<CheckInResponse> {
    const decoded = this.qrService.decode(qrCode);

    if (!decoded.valid) {
      this.logger.warn(`Invalid QR code signature: ${qrCode}`);
      return { status: 'INVALID', valid: false };
    }

    if (!decoded.ticketId || !decoded.eventId) {
      this.logger.warn(`Invalid QR code payload: ${qrCode}`);
      return { status: 'INVALID', valid: false };
    }

    const ticket = await this.generatedTicketRepo.findOne({
      where: { id: decoded.ticketId },
      relations: ['ticket', 'ticket.event'],
    });

    if (!ticket) {
      this.logger.warn(`Ticket not found: ${decoded.ticketId}`);
      return { status: 'INVALID', valid: false };
    }

    if (ticket.ticket.eventId !== decoded.eventId) {
      this.logger.warn(`Event ID mismatch - expected: ${decoded.eventId}, actual: ${ticket.ticket.eventId}, ticket: ${decoded.ticketId}`);
      return { status: 'INVALID', valid: false };
    }

    const result = await this.generatedTicketRepo
      .createQueryBuilder()
      .update(GeneratedEventTicket)
      .set({ isUsed: true })
      .where('id = :ticketId AND isUsed = :isUsed', {
        ticketId: decoded.ticketId,
        isUsed: false,
      })
      .execute();

    if (result.affected === 0) {
      this.logger.info(`Ticket already used: ${decoded.ticketId}`);
      return {
        status: 'ALREADY_USED',
        valid: false,
        ticketId: decoded.ticketId,
        eventId: decoded.eventId,
      };
    }

    this.logger.info(`Ticket validated successfully - ticket: ${decoded.ticketId}, event: ${decoded.eventId}`);

    return {
      status: 'VALID',
      valid: true,
      ticketId: decoded.ticketId,
      eventId: decoded.eventId,
    };
  }

  async processPdfTicket(pdfBuffer: Buffer): Promise<CheckInResponse> {
    try {
      const qrCode = this.extractQrFromPdfText(pdfBuffer.toString('latin1'));

      if (!qrCode) {
        this.logger.warn('No QR code marker found in PDF ticket');
        return { status: 'INVALID', valid: false };
      }

      return await this.validateTicket(qrCode);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;

      this.logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to process PDF ticket');
      throw new BadRequestException('Invalid PDF file or unable to extract QR code');
    }
  }

  private extractQrFromPdfText(text: string): string | null {
    const markers = [/CHECKIN_QR:([A-Za-z0-9+/=]+)/, /QR_PAYLOAD:([A-Za-z0-9+/=]+)/, /QR_CODE:([A-Za-z0-9+/=]+)/];

    for (const pattern of markers) {
      const match = new RegExp(pattern).exec(text);
      if (match?.[1]) return match[1].trim();
    }

    return null;
  }
}
