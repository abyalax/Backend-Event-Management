import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PinoLogger } from 'nestjs-pino';
import { PaymentService } from './payment.service';
import { EXPIRY_CRON } from './payment.constant';

const cronExpiry = process.env.NODE_ENV === 'test' ? () => () => undefined : () => Cron(EXPIRY_CRON);

@Injectable()
export class PaymentExpiryCron {
  constructor(
    private readonly logger: PinoLogger,
    private readonly paymentService: PaymentService,
  ) {}

  @cronExpiry()
  async handleExpiredTransactions(): Promise<void> {
    const expired = await this.paymentService.findExpiredPending();

    if (!expired.length) return;

    this.logger.info({ count: expired.length }, 'Found expired pending transactions');

    for (const tx of expired) {
      try {
        await this.paymentService.enqueueExpiry(tx.id, tx.externalId);
        this.logger.info({ transactionId: tx.id }, 'Expiry job enqueued from cron');
      } catch (error) {
        this.logger.error({ transactionId: tx.id, error }, 'Failed to enqueue expiry job from cron');
      }
    }
  }
}
