import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { QRService } from '~/modules/qr-code/qr-code.service';
import { GeneratedEventTicket } from '~/modules/tickets/entities/generated-event-ticket.entity';
import { REPOSITORY } from '~/common/constants/database';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class CheckInService {
  constructor(
    @Inject(REPOSITORY.GENERATED_EVENT_TICKET)
    private readonly generatedTicketRepo: Repository<GeneratedEventTicket>,
    private readonly qrService: QRService,
    private readonly logger: PinoLogger,
  ) {}

  async validateTicket(qrCode: string): Promise<{ status: 'VALID' | 'ALREADY_USED' | 'INVALID' }> {
    // Decode and verify QR code
    const decoded = this.qrService.decode(qrCode);

    if (!decoded.valid) {
      this.logger.warn(`Invalid QR code signature: ${qrCode}`);
      return { status: 'INVALID' };
    }

    if (!decoded.ticketId || !decoded.eventId) {
      this.logger.warn(`Invalid QR code payload: ${qrCode}`);
      return { status: 'INVALID' };
    }

    // Find the generated ticket
    const ticket = await this.generatedTicketRepo.findOne({
      where: { id: decoded.ticketId },
      relations: ['ticket', 'ticket.event'],
    });

    if (!ticket) {
      this.logger.warn(`Ticket not found: ${decoded.ticketId}`);
      return { status: 'INVALID' };
    }

    // Verify event ID matches
    if (ticket.ticket.eventId !== decoded.eventId) {
      this.logger.warn(`Event ID mismatch - Expected: ${decoded.eventId}, Actual: ${ticket.ticket.eventId}, Ticket: ${decoded.ticketId}`);
      return { status: 'INVALID' };
    }

    // Atomic validation - mark as used if not already used
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
      return { status: 'ALREADY_USED' };
    }

    this.logger.info(`Ticket validated successfully - Ticket: ${decoded.ticketId}, Event: ${decoded.eventId}`);

    return { status: 'VALID' };
  }
}
