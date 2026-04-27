import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PaymentService } from '../payment.service';
import { OrderService } from '~/modules/orders/order.service';
import {
  WebhookJobData,
  XenditInvoiceWebhook,
  XenditVirtualAccountWebhook,
  XenditQrisWebhook,
  XenditEwalletWebhook,
} from '../interfaces/xendit-webhook.interface';
import { WebhookEventType, PaymentStatus } from '../payment.enum';
import { PAYMENT_QUEUE, WEBHOOK_JOB } from '../payment.constant';

import { EmailService } from '~/infrastructure/email/email.service';

@Processor(PAYMENT_QUEUE)
export class PaymentWebhookProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(PaymentWebhookProcessor.name)
    private readonly logger: PinoLogger,
    private readonly paymentService: PaymentService,
    private readonly orderService: OrderService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== WEBHOOK_JOB) return;

    const { type, payload } = job.data as WebhookJobData;

    this.logger.info({ jobId: job.id, type }, 'Processing webhook job');

    let externalId: string | undefined;
    let paidStatus = false;

    switch (type) {
      case WebhookEventType.INVOICE: {
        const p = payload as XenditInvoiceWebhook;
        await this.paymentService.processInvoiceWebhook(p);
        externalId = p.external_id;
        paidStatus = ['PAID', 'SETTLED'].includes(p.status);
        if (paidStatus) {
          await this.orderService.handleSuccessfulPayment(externalId);
        } else if (p.status === 'EXPIRED') {
          await this.orderService.handleExpiredPayment(externalId);
        }
        break;
      }
      case WebhookEventType.VIRTUAL_ACCOUNT: {
        const p = payload as XenditVirtualAccountWebhook;
        await this.paymentService.processVirtualAccountWebhook(p);
        externalId = p.external_id;
        paidStatus = true;
        await this.orderService.handleSuccessfulPayment(externalId);
        break;
      }
      case WebhookEventType.QRIS: {
        const p = payload as XenditQrisWebhook;
        await this.paymentService.processQrisWebhook(p);
        externalId = p.reference_id;
        paidStatus = p.status === 'COMPLETED';
        if (paidStatus) {
          await this.orderService.handleSuccessfulPayment(externalId);
        } else if (p.status === 'EXPIRED') {
          await this.orderService.handleExpiredPayment(externalId);
        }
        break;
      }
      case WebhookEventType.EWALLET: {
        const p = payload as XenditEwalletWebhook;
        await this.paymentService.processEwalletWebhook(p);
        externalId = p.data.reference_id;
        paidStatus = p.data.status === 'SUCCEEDED';
        if (paidStatus) {
          await this.orderService.handleSuccessfulPayment(externalId);
        } else if (p.data.status === 'FAILED' || p.data.status === 'VOIDED') {
          await this.orderService.handleFailedPayment(externalId);
        }
        break;
      }
      default:
        this.logger.warn({ type }, 'Unknown webhook event type');
        return;
    }

    if (paidStatus && externalId) {
      await this.sendPaymentEmail(externalId);
    }

    this.logger.info({ jobId: job.id, type }, 'Webhook job completed');
  }

  private async sendPaymentEmail(externalId: string): Promise<void> {
    const transaction = await this.paymentService.getTransactionByExternalId(externalId);
    if (!transaction || !transaction.payerEmail) return;

    if (transaction.status !== PaymentStatus.PAID && transaction.status !== PaymentStatus.SETTLED) return;

    try {
      await this.emailService.sendEmail({
        to: transaction.payerEmail,
        subject: 'Payment Confirmed',
        html: `<h1>Payment Confirmed</h1>
               <p>Your payment has been confirmed.</p>
               <p>Transaction ID: ${transaction.id}</p>
               <p>External ID: ${transaction.externalId}</p>
               <p>Amount: ${transaction.amount} ${transaction.currency}</p>
               <p>Payment Method: ${transaction.paymentMethod}</p>
               <p>Paid At: ${transaction.paidAt?.toISOString()}</p>`,
      });
      this.logger.info({ transactionId: transaction.id, to: transaction.payerEmail }, 'Payment confirmation email sent');
    } catch (error) {
      this.logger.error({ transactionId: transaction.id, error }, 'Failed to send payment confirmation email');
      await this.paymentService.incrementRetry(transaction.id);
      throw error;
    }
  }
}
