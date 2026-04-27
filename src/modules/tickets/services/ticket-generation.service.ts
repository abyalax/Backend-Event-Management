import { Injectable, Logger } from '@nestjs/common';
import { OrderItem } from '~/modules/orders/entity/order-item.entity';
import { GeneratedEventTicket } from '../entity/generated-event-ticket.entity';

@Injectable()
export class TicketGenerationService {
  private readonly logger = new Logger(TicketGenerationService.name);

  async generateTicketsForOrderItems(orderItems: OrderItem[]): Promise<GeneratedEventTicket[]> {
    const generatedTickets: GeneratedEventTicket[] = [];

    for (const orderItem of orderItems) {
      for (let i = 0; i < orderItem.quantity; i++) {
        const ticket = await this.generateSingleTicket(orderItem);
        generatedTickets.push(ticket);
      }
    }

    return generatedTickets;
  }

  private async generateSingleTicket(orderItem: OrderItem): Promise<GeneratedEventTicket> {
    this.logger.log(`Generating ticket for order item ${orderItem.id}`);

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

  async validateTicket(ticketId: string): Promise<boolean> {
    try {
      this.logger.log(`Validating ticket ${ticketId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to validate ticket ${ticketId}:`, error);
      return false;
    }
  }

  async markTicketAsUsed(ticketId: string): Promise<void> {
    try {
      this.logger.log(`Marking ticket ${ticketId} as used`);
    } catch (error) {
      this.logger.error(`Failed to mark ticket ${ticketId} as used:`, error);
      throw error;
    }
  }
}
