import { NotFoundException } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { PaymentService } from '../payment.service';
import { OrderService } from '~/modules/orders/order.service';
import { WebhookJobData } from '../interfaces/xendit-webhook.interface';
import { XenditInvoiceWebhookDto } from '../dto/xendit-invoice-webhook.dto';
import { XenditVirtualAccountWebhookDto } from '../dto/xendit-virtual-account-webhook.dto';
import { XenditQrisWebhookDto } from '../dto/xendit-qris-webhook.dto';
import { XenditEwalletWebhookDto } from '../dto/xendit-ewallet-webhook.dto';
import { WebhookEventType, PaymentStatus } from '../payment.enum';
import { PAYMENT_QUEUE, WEBHOOK_JOB } from '../payment.constant';

import { EmailService } from '~/infrastructure/email/email.service';

@Processor(PAYMENT_QUEUE)
export class PaymentWebhookProcessor extends WorkerHost {
  constructor(
    private readonly logger: PinoLogger,
    private readonly paymentService: PaymentService,
    private readonly orderService: OrderService,
    private readonly emailService: EmailService,
  ) {
    super();
    this.logger.info('PaymentWebhookProcessor initialized');
  }

  async process(job: Job): Promise<void> {
    if (job.name !== WEBHOOK_JOB) return;

    const { type, payload } = job.data as WebhookJobData;

    this.logger.info({ jobId: job.id, type }, 'Processing webhook job');

    let externalId: string | undefined;
    let paidStatus = false;

    switch (type) {
      case WebhookEventType.INVOICE: {
        const p = payload as XenditInvoiceWebhookDto;
        const transaction = await this.paymentService.processInvoiceWebhook(p);
        externalId = transaction?.externalId;
        paidStatus = ['PAID', 'SETTLED'].includes(p.status);
        if (paidStatus && externalId) {
          await this.handleSuccessfulOrderPayment(externalId);
        } else if (p.status === 'EXPIRED' && externalId) {
          await this.handleExpiredOrderPayment(externalId);
        }
        break;
      }
      case WebhookEventType.VIRTUAL_ACCOUNT: {
        const p = payload as XenditVirtualAccountWebhookDto;
        const transaction = await this.paymentService.processVirtualAccountWebhook(p);
        externalId = transaction?.externalId;
        paidStatus = Boolean(transaction);
        if (externalId) {
          await this.handleSuccessfulOrderPayment(externalId);
        }
        break;
      }
      case WebhookEventType.QRIS: {
        const p = payload as XenditQrisWebhookDto;
        const transaction = await this.paymentService.processQrisWebhook(p);
        externalId = transaction?.externalId;
        paidStatus = Boolean(transaction) && ['SUCCEEDED', 'COMPLETED'].includes(p.data.status);
        if (paidStatus && externalId) {
          await this.handleSuccessfulOrderPayment(externalId);
        } else if (p.data.status === 'EXPIRED' && externalId) {
          await this.handleExpiredOrderPayment(externalId);
        }
        break;
      }
      case WebhookEventType.EWALLET: {
        const p = payload as XenditEwalletWebhookDto;
        const transaction = await this.paymentService.processEwalletWebhook(p);
        externalId = transaction?.externalId;
        paidStatus = Boolean(transaction) && p.data.status === 'SUCCEEDED';
        if (paidStatus && externalId) {
          await this.handleSuccessfulOrderPayment(externalId);
        } else if ((p.data.status === 'FAILED' || p.data.status === 'VOIDED') && externalId) {
          await this.handleFailedOrderPayment(externalId);
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

  private async handleSuccessfulOrderPayment(externalId: string): Promise<void> {
    try {
      await this.orderService.handleSuccessfulPayment(externalId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn({ externalId }, 'Payment webhook has no matching order, skipping order success handling');
        return;
      }
      throw error;
    }
  }

  private async handleExpiredOrderPayment(externalId: string): Promise<void> {
    try {
      await this.orderService.handleExpiredPayment(externalId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn({ externalId }, 'Payment webhook has no matching order, skipping order expiry handling');
        return;
      }
      throw error;
    }
  }

  private async handleFailedOrderPayment(externalId: string): Promise<void> {
    try {
      await this.orderService.handleFailedPayment(externalId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn({ externalId }, 'Payment webhook has no matching order, skipping order failure handling');
        return;
      }
      throw error;
    }
  }

  private async sendPaymentEmail(externalId: string): Promise<void> {
    const transaction = await this.paymentService.getTransactionByExternalId(externalId);
    if (!transaction?.payerEmail) return;

    if (transaction.status !== PaymentStatus.PAID && transaction.status !== PaymentStatus.SETTLED) return;

    try {
      await this.emailService.sendTemplateEmail({
        to: transaction.payerEmail,
        subject: 'Payment Confirmed',
        template: 'payment-confirmed',
        props: {
          transactionId: transaction.id,
          externalId: transaction.externalId,
          amount: transaction.amount,
          currency: transaction.currency,
          paymentMethod: transaction.paymentMethod,
          paidAt: transaction.paidAt,
        },
      });
      this.logger.info({ transactionId: transaction.id, to: transaction.payerEmail }, 'Payment confirmation email sent');
    } catch (error) {
      this.logger.error({ transactionId: transaction.id, error }, 'Failed to send payment confirmation email');
      await this.paymentService.incrementRetry(transaction.id);
      throw error;
    }
  }
}
