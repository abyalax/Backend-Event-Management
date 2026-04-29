import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { LessThan, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import Xendit from 'xendit-node';
import type { XenditInvoiceApi, XenditPaymentMethodApi, XenditPaymentMethodResponse } from './interfaces/xendit-types.interface';
import { Transaction } from './entities/transaction.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateVirtualAccountDto } from './dto/create-virtual-account.dto';
import { CreateQrisDto } from './dto/create-qris.dto';
import { CreateEwalletDto } from './dto/create-ewallet.dto';
import { EwalletType, PaymentMethod, PaymentStatus, VirtualAccountBank, WebhookEventType } from './payment.enum';
import {
  EWalletChannelCode,
  PaymentMethodReusability,
  PaymentMethodType,
  QRCodeChannelCode,
  VirtualAccountChannelCode,
} from 'xendit-node/payment_method/models';
import { WebhookJobData } from './interfaces/xendit-webhook.interface';
import { XenditInvoiceWebhookDto } from './dto/xendit-invoice-webhook.dto';
import { XenditVirtualAccountWebhookDto } from './dto/xendit-virtual-account-webhook.dto';
import { XenditQrisWebhookDto } from './dto/xendit-qris-webhook.dto';
import { XenditEwalletWebhookDto } from './dto/xendit-ewallet-webhook.dto';
import { EXPIRY_JOB, MAX_RETRY_ATTEMPTS, PAYMENT_QUEUE, WEBHOOK_JOB } from './payment.constant';
import { REPOSITORY } from '~/common/constants/database';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';

@Injectable()
export class PaymentService {
  private readonly invoice?: XenditInvoiceApi;
  private readonly paymentMethod?: XenditPaymentMethodApi;
  private readonly xenditSecretKey: string;
  private readonly paymentProvider: 'mock' | 'xendit';

  constructor(
    private readonly logger: PinoLogger,

    @Inject(REPOSITORY.TRANSACTION)
    private readonly transactionRepo: Repository<Transaction>,

    @Inject(CONFIG_SERVICE)
    private readonly config: ConfigService,

    @InjectQueue(PAYMENT_QUEUE)
    private readonly paymentQueue: Queue,
  ) {
    this.xenditSecretKey = this.config.get('XENDIT_SECRET_KEY');
    this.paymentProvider = this.config.get('PAYMENT_PROVIDER');
    if (this.paymentProvider === 'xendit') {
      const xendit = new Xendit({ secretKey: this.xenditSecretKey });
      this.invoice = xendit.Invoice;
      this.paymentMethod = xendit.PaymentMethod;
    }
  }

  async createInvoice(dto: CreateInvoiceDto): Promise<Transaction> {
    const existing = await this.transactionRepo.findOne({
      where: { externalId: dto.externalId },
    });
    if (existing) {
      this.logger.info({ externalId: dto.externalId }, 'Returning existing invoice transaction');
      return existing;
    }

    const transaction = this.paymentProvider === 'mock' ? this.buildMockInvoiceTransaction(dto) : await this.buildXenditInvoiceTransaction(dto);

    const saved = await this.transactionRepo.save(transaction);
    this.logger.info({ transactionId: saved.id, externalId: saved.externalId }, 'Invoice created');
    return saved;
  }

  async createVirtualAccount(dto: CreateVirtualAccountDto): Promise<Transaction> {
    const existing = await this.transactionRepo.findOne({
      where: { externalId: dto.externalId },
    });
    if (existing) {
      this.logger.info({ externalId: dto.externalId }, 'Returning existing VA transaction');
      return existing;
    }

    if (this.paymentProvider === 'mock') {
      const transaction = this.buildMockTransaction({
        externalId: dto.externalId,
        amount: dto.expectedAmount,
        paymentMethod: PaymentMethod.VIRTUAL_ACCOUNT,
        paymentUrl: `mock://payments/virtual-account/${dto.externalId}`,
        description: dto.description,
      });
      return this.transactionRepo.save(transaction);
    }

    const xenditVA = await this.getPaymentMethodClient().createPaymentMethod({
      data: {
        type: PaymentMethodType.VirtualAccount,
        reusability: PaymentMethodReusability.OneTimeUse,
        referenceId: dto.externalId,
        description: dto.description,
        virtualAccount: {
          channelCode: this.mapVirtualAccountBank(dto.bankCode),
          currency: 'IDR',
          amount: dto.expectedAmount,
          channelProperties: {
            customerName: dto.name,
          },
        },
      },
    });

    const transaction = this.transactionRepo.create({
      externalId: dto.externalId,
      xenditId: xenditVA.id,
      paymentMethod: PaymentMethod.VIRTUAL_ACCOUNT,
      status: PaymentStatus.PENDING,
      amount: dto.expectedAmount,
      currency: 'IDR',
      description: dto.description,
      paymentUrl: this.extractPaymentUrl(xenditVA),
      expiresAt: xenditVA.virtualAccount?.channelProperties?.expiresAt,
      xenditResponse: { ...xenditVA },
    });

    const saved = await this.transactionRepo.save(transaction);
    this.logger.info({ transactionId: saved.id, bankCode: dto.bankCode }, 'Virtual account created');
    return saved;
  }

  async createQris(dto: CreateQrisDto): Promise<Transaction> {
    const existing = await this.transactionRepo.findOne({
      where: { externalId: dto.referenceId },
    });
    if (existing) {
      this.logger.info({ externalId: dto.referenceId }, 'Returning existing QRIS transaction');
      return existing;
    }

    if (this.paymentProvider === 'mock') {
      const transaction = this.buildMockTransaction({
        externalId: dto.referenceId,
        amount: dto.amount,
        paymentMethod: PaymentMethod.QRIS,
        paymentUrl: `mock://payments/qris/${dto.referenceId}`,
      });
      return this.transactionRepo.save(transaction);
    }

    const xenditQr = await this.getPaymentMethodClient().createPaymentMethod({
      data: {
        type: PaymentMethodType.QrCode,
        reusability: PaymentMethodReusability.OneTimeUse,
        referenceId: dto.referenceId,
        qrCode: {
          channelCode: QRCodeChannelCode.Qris,
          currency: dto.currency ?? 'IDR',
          amount: dto.amount,
        },
      },
    });

    const transaction = this.transactionRepo.create({
      externalId: dto.referenceId,
      xenditId: xenditQr.id,
      paymentMethod: PaymentMethod.QRIS,
      status: PaymentStatus.PENDING,
      amount: dto.amount,
      currency: dto.currency ?? 'IDR',
      paymentUrl: xenditQr.qrCode?.channelProperties?.qrString,
      expiresAt: xenditQr.qrCode?.channelProperties?.expiresAt,
      xenditResponse: { ...xenditQr },
    });

    const saved = await this.transactionRepo.save(transaction);
    this.logger.info({ transactionId: saved.id }, 'QRIS created');
    return saved;
  }

  async createEwallet(dto: CreateEwalletDto): Promise<Transaction> {
    const existing = await this.transactionRepo.findOne({
      where: { externalId: dto.referenceId },
    });
    if (existing) {
      this.logger.info({ externalId: dto.referenceId }, 'Returning existing e-wallet transaction');
      return existing;
    }

    if (this.paymentProvider === 'mock') {
      const transaction = this.buildMockTransaction({
        externalId: dto.referenceId,
        amount: dto.amount,
        paymentMethod: PaymentMethod.EWALLET,
        paymentUrl: `mock://payments/ewallet/${dto.referenceId}`,
      });
      return this.transactionRepo.save(transaction);
    }

    const xenditEwallet = await this.getPaymentMethodClient().createPaymentMethod({
      data: {
        type: PaymentMethodType.Ewallet,
        reusability: PaymentMethodReusability.OneTimeUse,
        referenceId: dto.referenceId,
        ewallet: {
          channelCode: this.mapEwalletChannel(dto.channelCode),
          channelProperties: {
            successReturnUrl: dto.channelProperties?.successReturnUrl,
            failureReturnUrl: dto.channelProperties?.failureReturnUrl,
            cancelReturnUrl: dto.channelProperties?.cancelReturnUrl,
            mobileNumber: dto.channelProperties?.mobileNumber,
            cashtag: dto.channelProperties?.cashtag,
          },
        },
      },
    });

    const transaction = this.transactionRepo.create({
      externalId: dto.referenceId,
      xenditId: xenditEwallet.id,
      paymentMethod: PaymentMethod.EWALLET,
      status: PaymentStatus.PENDING,
      amount: dto.amount,
      currency: dto.currency,
      paymentUrl: this.extractPaymentUrl(xenditEwallet),
      xenditResponse: { ...xenditEwallet },
    });

    const saved = await this.transactionRepo.save(transaction);
    this.logger.info({ transactionId: saved.id, channelCode: dto.channelCode }, 'E-wallet created');
    return saved;
  }

  async enqueueWebhook(type: WebhookEventType, payload: WebhookJobData['payload']): Promise<void> {
    await this.paymentQueue.add(
      WEBHOOK_JOB,
      { type, payload },
      {
        attempts: MAX_RETRY_ATTEMPTS,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async enqueueExpiry(transactionId: string, externalId: string): Promise<void> {
    await this.paymentQueue.add(
      EXPIRY_JOB,
      { transactionId, externalId },
      {
        attempts: MAX_RETRY_ATTEMPTS,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async processInvoiceWebhook(payload: XenditInvoiceWebhookDto): Promise<void> {
    const transaction = await this.transactionRepo.findOne({
      where: { externalId: payload.external_id },
    });
    if (!transaction) {
      this.logger.warn({ externalId: payload.external_id }, 'Transaction not found for invoice webhook');
      return;
    }

    if (transaction.status !== PaymentStatus.PENDING) {
      this.logger.info({ externalId: payload.external_id, status: transaction.status }, 'Skipping idempotent invoice webhook');
      return;
    }

    const statusMap: Record<string, PaymentStatus> = {
      PAID: PaymentStatus.PAID,
      EXPIRED: PaymentStatus.EXPIRED,
      SETTLED: PaymentStatus.SETTLED,
    };

    transaction.status = statusMap[payload.status] ?? transaction.status;
    if (payload.paid_at) transaction.paidAt = new Date(payload.paid_at);

    await this.transactionRepo.save(transaction);
    this.logger.info({ transactionId: transaction.id, status: payload.status }, 'Invoice webhook processed');
  }

  async processVirtualAccountWebhook(payload: XenditVirtualAccountWebhookDto): Promise<void> {
    const transaction = await this.transactionRepo.findOne({
      where: { externalId: payload.external_id },
    });
    if (!transaction) {
      this.logger.warn({ externalId: payload.external_id }, 'Transaction not found for VA webhook');
      return;
    }

    if (transaction.status !== PaymentStatus.PENDING) {
      this.logger.info({ externalId: payload.external_id }, 'Skipping idempotent VA webhook');
      return;
    }

    transaction.status = PaymentStatus.PAID;
    transaction.paidAt = new Date(payload.transaction_timestamp);

    await this.transactionRepo.save(transaction);
    this.logger.info({ transactionId: transaction.id }, 'VA webhook processed');
  }

  async processQrisWebhook(payload: XenditQrisWebhookDto): Promise<void> {
    const transaction = await this.transactionRepo.findOne({
      where: { externalId: payload.reference_id },
    });
    if (!transaction) {
      this.logger.warn({ referenceId: payload.reference_id }, 'Transaction not found for QRIS webhook');
      return;
    }

    if (transaction.status !== PaymentStatus.PENDING) {
      this.logger.info({ referenceId: payload.reference_id }, 'Skipping idempotent QRIS webhook');
      return;
    }

    const statusMap: Record<string, PaymentStatus> = {
      COMPLETED: PaymentStatus.PAID,
      EXPIRED: PaymentStatus.EXPIRED,
    };

    transaction.status = statusMap[payload.status] ?? transaction.status;
    if (transaction.status === PaymentStatus.PAID) transaction.paidAt = new Date();

    await this.transactionRepo.save(transaction);
    this.logger.info({ transactionId: transaction.id, status: payload.status }, 'QRIS webhook processed');
  }

  async processEwalletWebhook(payload: XenditEwalletWebhookDto): Promise<void> {
    const transaction = await this.transactionRepo.findOne({
      where: { externalId: payload.data.reference_id },
    });
    if (!transaction) {
      this.logger.warn({ referenceId: payload.data.reference_id }, 'Transaction not found for e-wallet webhook');
      return;
    }

    if (transaction.status !== PaymentStatus.PENDING) {
      this.logger.info({ referenceId: payload.data.reference_id }, 'Skipping idempotent e-wallet webhook');
      return;
    }

    const statusMap: Record<string, PaymentStatus> = {
      SUCCEEDED: PaymentStatus.PAID,
      FAILED: PaymentStatus.FAILED,
      VOIDED: PaymentStatus.FAILED,
    };

    transaction.status = statusMap[payload.data.status] ?? transaction.status;
    if (transaction.status === PaymentStatus.PAID) {
      transaction.paidAt = new Date(payload.data.updated);
    }

    await this.transactionRepo.save(transaction);
    this.logger.info({ transactionId: transaction.id, status: payload.data.status }, 'E-wallet webhook processed');
  }

  async markExpired(transactionId: string): Promise<Transaction | null> {
    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId },
    });

    if (transaction?.status !== PaymentStatus.PENDING) {
      return null;
    }

    transaction.status = PaymentStatus.EXPIRED;
    return this.transactionRepo.save(transaction);
  }

  async findExpiredPending(): Promise<Transaction[]> {
    return this.transactionRepo.find({
      where: {
        status: PaymentStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
      take: 100,
    });
  }

  async incrementRetry(id: string): Promise<void> {
    await this.transactionRepo.increment({ id }, 'retryCount', 1);
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    return this.transactionRepo.findOne({ where: { id } });
  }

  async getTransactionByExternalId(externalId: string): Promise<Transaction | null> {
    return this.transactionRepo.findOne({ where: { externalId } });
  }

  async ping(): Promise<boolean> {
    try {
      await this.transactionRepo.count();
      return true;
    } catch {
      return false;
    }
  }

  private extractPaymentUrl(paymentMethod: XenditPaymentMethodResponse): string | undefined {
    return paymentMethod.actions?.find((action) => action.url)?.url;
  }

  private buildMockInvoiceTransaction(dto: CreateInvoiceDto): Transaction {
    this.logger.info('Create Mockup Transaction');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    return this.transactionRepo.create({
      externalId: dto.externalId,
      xenditId: `mock-invoice-${randomUUID()}`,
      paymentMethod: PaymentMethod.INVOICE,
      status: PaymentStatus.SETTLED,
      amount: dto.amount,
      currency: dto.currency ?? 'IDR',
      payerEmail: dto.payerEmail,
      description: dto.description,
      paymentUrl: `mock://payments/invoice/${dto.externalId}`,
      paidAt: now,
      expiresAt,
      xenditResponse: {
        provider: 'mock',
        externalId: dto.externalId,
        paymentUrl: `mock://payments/invoice/${dto.externalId}`,
        status: PaymentStatus.SETTLED,
      },
      metadata: {
        provider: 'mock',
        mode: 'invoice',
      },
    });
  }

  private buildMockTransaction(dto: {
    externalId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentUrl: string;
    description?: string;
  }): Transaction {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const settledStatus = dto.paymentMethod === PaymentMethod.VIRTUAL_ACCOUNT ? PaymentStatus.PAID : PaymentStatus.SETTLED;

    return this.transactionRepo.create({
      externalId: dto.externalId,
      xenditId: `mock-${dto.paymentMethod.toLowerCase()}-${randomUUID()}`,
      paymentMethod: dto.paymentMethod,
      status: settledStatus,
      amount: dto.amount,
      currency: 'IDR',
      description: dto.description,
      paymentUrl: dto.paymentUrl,
      paidAt: now,
      expiresAt,
      xenditResponse: {
        provider: 'mock',
        externalId: dto.externalId,
        paymentMethod: dto.paymentMethod,
        paymentUrl: dto.paymentUrl,
        status: settledStatus,
      },
      metadata: {
        provider: 'mock',
        paymentMethod: dto.paymentMethod,
      },
    });
  }

  private async buildXenditInvoiceTransaction(dto: CreateInvoiceDto): Promise<Transaction> {
    this.logger.info('Create Xendit Transaction');
    if (!this.invoice) {
      throw new Error('Xendit invoice client is not initialized');
    }
    const xenditInvoice = await this.invoice.createInvoice({
      data: {
        externalId: dto.externalId,
        amount: dto.amount,
        payerEmail: dto.payerEmail,
        description: dto.description,
        currency: dto.currency ?? 'IDR',
        successRedirectUrl: dto.successRedirectUrl,
        failureRedirectUrl: dto.failureRedirectUrl,
      },
    });

    return this.transactionRepo.create({
      externalId: dto.externalId,
      xenditId: xenditInvoice.id ?? dto.externalId,
      paymentMethod: PaymentMethod.INVOICE,
      status: PaymentStatus.PENDING,
      amount: dto.amount,
      currency: dto.currency ?? 'IDR',
      payerEmail: dto.payerEmail,
      description: dto.description,
      paymentUrl: xenditInvoice.invoiceUrl,
      expiresAt: xenditInvoice.expiryDate,
      xenditResponse: { ...xenditInvoice },
    });
  }

  private mapVirtualAccountBank(bankCode: CreateVirtualAccountDto['bankCode']): VirtualAccountChannelCode {
    switch (bankCode) {
      case VirtualAccountBank.BCA:
        return VirtualAccountChannelCode.Bca;
      case VirtualAccountBank.BNI:
        return VirtualAccountChannelCode.Bni;
      case VirtualAccountBank.BRI:
        return VirtualAccountChannelCode.Bri;
      case VirtualAccountBank.MANDIRI:
        return VirtualAccountChannelCode.Mandiri;
      case VirtualAccountBank.PERMATA:
        return VirtualAccountChannelCode.Permata;
      case VirtualAccountBank.BSI:
        return VirtualAccountChannelCode.Bsi;
      default:
        return VirtualAccountChannelCode.BankTransfer;
    }
  }

  private mapEwalletChannel(channelCode: CreateEwalletDto['channelCode']): EWalletChannelCode {
    switch (channelCode) {
      case EwalletType.OVO:
        return EWalletChannelCode.Ovo;
      case EwalletType.DANA:
        return EWalletChannelCode.Dana;
      case EwalletType.SHOPEEPAY:
        return EWalletChannelCode.Shopeepay;
      case EwalletType.LINKAJA:
        return EWalletChannelCode.Linkaja;
      case EwalletType.GOPAY:
        throw new BadRequestException('GOPAY is not supported by the current Xendit payment method API');
      default:
        return EWalletChannelCode.Ovo;
    }
  }

  private getPaymentMethodClient(): XenditPaymentMethodApi {
    if (!this.paymentMethod) {
      throw new Error('Xendit payment method client is not initialized');
    }

    return this.paymentMethod;
  }
}
