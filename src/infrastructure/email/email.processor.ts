import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject } from '@nestjs/common';
import { EmailService } from './email.service';
import { Repository } from 'typeorm';
import { GeneratedEventTicket } from '~/modules/tickets/entities/generated-event-ticket.entity';
import { REPOSITORY } from '~/common/constants/database';
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

    const subject = `Your ticket for ${event.title}`;

    try {
      await this.emailService.sendTemplateEmail({
        to: user.email,
        subject,
        template: 'ticket-ready',
        props: {
          userName: user.name,
          eventTitle: event.title,
          eventDate: event.startDate,
          eventLocation: event.location,
          ticketId: ticket.id,
          pdfUrl: ticket.pdfUrl,
        },
      });

      this.logger.info(`Ticket email sent successfully - Ticket: ${ticketId}, User: ${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send ticket email - Ticket: ${ticketId}, User: ${user.email}, Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
