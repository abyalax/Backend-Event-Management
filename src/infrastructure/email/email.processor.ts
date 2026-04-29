import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject } from '@nestjs/common';
import { EmailService } from './email.service';
import { Repository } from 'typeorm';
import { GeneratedEventTicket } from '~/modules/tickets/entities/generated-event-ticket.entity';
import { REPOSITORY } from '~/common/constants/database';
import { User } from '~/modules/users/entity/user.entity';
import { Event } from '~/modules/events/entity/event.entity';
import { PinoLogger } from 'nestjs-pino';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly logger: PinoLogger,
    private readonly emailService: EmailService,
    @Inject(REPOSITORY.GENERATED_EVENT_TICKET)
    private readonly generatedTicketRepo: Repository<GeneratedEventTicket>,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'send-ticket-email') {
      const { ticketId } = job.data as { ticketId: string };
      this.logger.info(`Processing send-ticket-email job for ticketId: ${ticketId}, jobId: ${job.id}`);
      await this.sendTicketEmail(ticketId);
    }
  }

  private async sendTicketEmail(ticketId: string): Promise<void> {
    const ticket = await this.generatedTicketRepo.findOne({
      where: { id: ticketId },
      relations: ['ticket', 'ticket.event', 'orderItem', 'orderItem.order', 'orderItem.order.user'],
    });

    if (!ticket) {
      this.logger.error({ ticketId }, 'Generated ticket not found');
      throw new Error(`Generated ticket ${ticketId} not found`);
    }

    const user = ticket.orderItem.order.user;
    const event = ticket.ticket.event;

    if (!user || !event) {
      this.logger.error({ ticketId }, 'User or event not found for ticket');
      throw new Error('User or event not found for ticket');
    }

    const emailHtml = this.generateTicketEmailHtml(ticket, user, event);
    const subject = `Your ticket for ${event.title}`;

    try {
      await this.emailService.sendEmail({
        to: user.email,
        subject,
        html: emailHtml,
      });

      this.logger.info(`Ticket email sent successfully - Ticket: ${ticketId}, User: ${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send ticket email - Ticket: ${ticketId}, User: ${user.email}, Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  private generateTicketEmailHtml(ticket: GeneratedEventTicket, user: User, event: Event): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Ticket - ${event.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
          .content { padding: 20px 0; }
          .ticket-info { background: #e9ecef; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .download-btn { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { border-top: 1px solid #ddd; padding-top: 20px; text-align: center; font-size: 0.9em; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Ticket is Ready!</h1>
            <p>Thank you for purchasing a ticket for ${event.title}</p>
          </div>
          
          <div class="content">
            <p>Hello ${user.name},</p>
            <p>Your ticket has been generated and is ready for download. You can access your ticket PDF using the link below:</p>
            
            <div class="ticket-info">
              <h3>Event Details</h3>
              <p><strong>Event:</strong> ${event.title}</p>
              <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>
              <p><strong>Location:</strong> ${event.location}</p>
              <p><strong>Ticket ID:</strong> ${ticket.id}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${ticket.pdfUrl}" class="download-btn">Download Your Ticket</a>
            </div>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>Please bring this ticket (printed or on your mobile device) to the event</li>
              <li>The QR code in the ticket will be scanned for entry</li>
              <li>This ticket can only be used once</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>If you have any questions, please contact our support team.</p>
            <p>Best regards,<br>The Event Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
