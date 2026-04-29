import { Injectable } from '@nestjs/common';
import { OrderItem } from '~/modules/orders/entity/order-item.entity';
import { GeneratedEventTicket } from '../entities/generated-event-ticket.entity';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class TicketGenerationService {
  constructor(private readonly logger: PinoLogger) {}

  generateTicketsForOrderItems(orderItems: OrderItem[]): GeneratedEventTicket[] {
    const generatedTickets: GeneratedEventTicket[] = [];

    for (const orderItem of orderItems) {
      for (let i = 0; i < orderItem.quantity; i++) {
        const ticket = this.generateSingleTicket(orderItem);
        generatedTickets.push(ticket);
      }
    }

    return generatedTickets;
  }

  private generateSingleTicket(orderItem: OrderItem): GeneratedEventTicket {
    this.logger.info(`Generating ticket for order item ${orderItem.id}`);

    const ticketId = this.generateTicketId();

    return {
      id: ticketId,
      orderItemId: orderItem.id,
      qrCodeUrl: `/tickets/${ticketId}/qr`,
      pdfUrl: `/tickets/${ticketId}/pdf`,
      isUsed: false,
      issuedAt: new Date(),
    } as GeneratedEventTicket;
  }

  private generateTicketId(): string {
    return `TKT-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;
  }

  validateTicket(ticketId: string): boolean {
    try {
      this.logger.info(`Validating ticket ${ticketId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to validate ticket ${ticketId}:`, error);
      return false;
    }
  }

  markTicketAsUsed(ticketId: string) {
    try {
      this.logger.info(`Marking ticket ${ticketId} as used`);
    } catch (error) {
      this.logger.error(`Failed to mark ticket ${ticketId} as used:`, error);
      throw error;
    }
  }
}
