import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { PaymentService } from '../payment.service';
import { EXPIRY_JOB, PAYMENT_QUEUE } from '../payment.constant';
import { EmailService } from '~/infrastructure/email/email.service';
import { ExpiryJobData } from '../interfaces/xendit-webhook.interface';
import { OrderService } from '~/modules/orders/order.service';

@Processor(PAYMENT_QUEUE)
export class PaymentExpiryProcessor extends WorkerHost {
  constructor(
    private readonly logger: PinoLogger,
    private readonly paymentService: PaymentService,
    private readonly orderService: OrderService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== EXPIRY_JOB) return;

    const { transactionId, externalId } = job.data as ExpiryJobData;
    this.logger.info({ jobId: job.id, transactionId }, 'Processing expiry job');

    const transaction = await this.paymentService.markExpired(transactionId);
    if (!transaction) {
      this.logger.info({ transactionId }, 'Transaction already settled or not found, skipping expiry');
      return;
    }

    await this.orderService.handleExpiredPayment(externalId);

    if (transaction.payerEmail) {
      try {
        await this.emailService.sendEmail({
          to: transaction.payerEmail,
          subject: 'Payment Expired',
          html: `<h1>Payment Expired</h1>
                 <p>Your payment has expired.</p>
                 <p>Transaction ID: ${transaction.id}</p>
                 <p>External ID: ${externalId}</p>
                 <p>Amount: ${transaction.amount} ${transaction.currency}</p>
                 <p>Payment Method: ${transaction.paymentMethod}</p>
                 <p>Expires At: ${transaction.expiresAt?.toISOString()}</p>`,
        });
        this.logger.info({ transactionId, to: transaction.payerEmail }, 'Payment expiry email sent');
      } catch (error) {
        this.logger.error({ transactionId, error }, 'Failed to send expiry email');
        await this.paymentService.incrementRetry(transactionId);
        throw error;
      }
    }

    this.logger.info({ jobId: job.id, transactionId }, 'Expiry job completed');
  }
}
