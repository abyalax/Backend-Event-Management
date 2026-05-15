import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { LessThan, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import Xendit from 'xendit-node';
import type {
  XenditInvoiceApi,
  XenditPaymentMethodApi,
  XenditPaymentMethodResponse,
  XenditPaymentRequestRequest,
  XenditPaymentRequestResponse,
} from './interfaces/xendit-types.interface';
import { Transaction } from './entities/transaction.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateVirtualAccountDto } from './dto/create-virtual-account.dto';
import { CreateQrisDto } from './dto/create-qris.dto';
import { CreateEwalletDto } from './dto/create-ewallet.dto';
import { EwalletType, PaymentMethod, PaymentStatus, VirtualAccountBank, WebhookEventType } from './payment.enum';
import { PaymentMethodReusability, PaymentMethodType, VirtualAccountChannelCode } from 'xendit-node/payment_method/models';
import {
  EWalletChannelCode as PaymentRequestEWalletChannelCode,
  PaymentMethodReusability as PaymentRequestMethodReusability,
  PaymentMethodType as PaymentRequestMethodType,
  PaymentRequestCurrency,
  QRCodeChannelCode as PaymentRequestQRCodeChannelCode,
} from 'xendit-node/payment_request/models';
import { WebhookJobData } from './interfaces/xendit-webhook.interface';
import { XenditInvoiceWebhookDto } from './dto/xendit-invoice-webhook.dto';
import { XenditVirtualAccountWebhookDto } from './dto/xendit-virtual-account-webhook.dto';
import { XenditQrisWebhookDto } from './dto/xendit-qris-webhook.dto';
import { XenditEwalletWebhookDto } from './dto/xendit-ewallet-webhook.dto';
import { EXPIRY_JOB, MAX_RETRY_ATTEMPTS, PAYMENT_QUEUE, WEBHOOK_JOB } from './payment.constant';
import { REPOSITORY } from '~/common/constants/database';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { DashboardCacheService } from '~/modules/dashboard/dashboard-cache.service';

@Injectable()
export class PaymentService {
  private readonly invoice?: XenditInvoiceApi;
  private readonly paymentMethod?: XenditPaymentMethodApi;
  private readonly paymentRequest?: XenditPaymentRequestApiLike;
  private readonly xenditSecretKey: string;
  private readonly paymentProvider: 'mock' | 'xendit';

  constructor(
    private readonly logger: PinoLogger,

    @Inject(REPOSITORY.TRANSACTION)
    private readonly transactionRepository: Repository<Transaction>,

    @Inject(CONFIG_SERVICE)
    private readonly config: ConfigService,

    @InjectQueue(PAYMENT_QUEUE)
    private readonly paymentQueue: Queue,

    private readonly dashboardCacheService: DashboardCacheService,
  ) {
    this.xenditSecretKey = this.config.get('XENDIT_SECRET_KEY');
    this.paymentProvider = this.config.get('PAYMENT_PROVIDER');
    if (this.paymentProvider === 'xendit') {
      const xendit = new Xendit({ secretKey: this.xenditSecretKey });
      this.invoice = xendit.Invoice;
      this.paymentMethod = xendit.PaymentMethod;
      this.paymentRequest = xendit.PaymentRequest;
    }
  }

  async createInvoice(dto: CreateInvoiceDto): Promise<Transaction> {
    const existing = await this.transactionRepository.findOne({
      where: { externalId: dto.externalId },
    });
    if (existing) {
      this.logger.info({ externalId: dto.externalId }, 'Returning existing invoice transaction');
      return existing;
    }

    const transaction = this.paymentProvider === 'mock' ? this.buildMockInvoiceTransaction(dto) : await this.buildXenditInvoiceTransaction(dto);

    const saved = await this.transactionRepository.save(transaction);
    this.logger.info({ transactionId: saved.id, externalId: saved.externalId }, 'Invoice created');
    return saved;
  }

  async createVirtualAccount(dto: CreateVirtualAccountDto): Promise<Transaction> {
    const existing = await this.transactionRepository.findOne({
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
      return this.transactionRepository.save(transaction);
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

    const transaction = this.transactionRepository.create({
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

    const saved = await this.transactionRepository.save(transaction);
    this.logger.info({ transactionId: saved.id, bankCode: dto.bankCode }, 'Virtual account created');
    return saved;
  }

  async createQris(dto: CreateQrisDto): Promise<Transaction> {
    const existing = await this.transactionRepository.findOne({
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
      return this.transactionRepository.save(transaction);
    }

    const xenditQr: XenditPaymentRequestResponse = await this.getPaymentRequestClient().createPaymentRequest({
      data: {
        referenceId: dto.referenceId,
        amount: dto.amount,
        currency: (dto.currency ?? 'IDR') as PaymentRequestCurrency,
        paymentMethod: {
          type: PaymentRequestMethodType.QrCode,
          reusability: PaymentRequestMethodReusability.OneTimeUse,
          referenceId: dto.referenceId,
          qrCode: {
            channelCode: PaymentRequestQRCodeChannelCode.Qris,
          },
        },
        metadata: {
          externalId: dto.referenceId,
        },
      },
    });

    const qrString = this.extractPaymentRequestQrString(xenditQr);

    const transaction = this.transactionRepository.create({
      externalId: dto.referenceId,
      xenditId: xenditQr.paymentMethod?.id ?? xenditQr.id,
      paymentMethod: PaymentMethod.QRIS,
      status: PaymentStatus.PENDING,
      amount: dto.amount,
      currency: dto.currency ?? 'IDR',
      paymentUrl: qrString,
      expiresAt: xenditQr.paymentMethod?.qrCode?.channelProperties?.expiresAt,
      xenditResponse: { ...xenditQr },
    });

    const saved = await this.transactionRepository.save(transaction);
    this.logger.info({ transactionId: saved.id }, 'QRIS created');
    return saved;
  }

  async createEwallet(dto: CreateEwalletDto): Promise<Transaction> {
    const existing = await this.transactionRepository.findOne({
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
      return this.transactionRepository.save(transaction);
    }

    const xenditEwallet: XenditPaymentRequestResponse = await this.getPaymentRequestClient().createPaymentRequest({
      data: {
        referenceId: dto.referenceId,
        amount: dto.amount,
        currency: dto.currency as PaymentRequestCurrency,
        paymentMethod: {
          type: PaymentRequestMethodType.Ewallet,
          reusability: PaymentRequestMethodReusability.OneTimeUse,
          referenceId: dto.referenceId,
          ewallet: {
            channelCode: this.mapPaymentRequestEwalletChannel(dto.channelCode),
          },
        },
        channelProperties: {
          successReturnUrl: dto.channelProperties?.successReturnUrl,
          failureReturnUrl: dto.channelProperties?.failureReturnUrl,
          cancelReturnUrl: dto.channelProperties?.cancelReturnUrl,
          pendingReturnUrl: dto.channelProperties?.pendingReturnUrl,
        },
        metadata: {
          externalId: dto.referenceId,
        },
      },
    });

    const transaction = this.transactionRepository.create({
      externalId: dto.referenceId,
      xenditId: xenditEwallet.paymentMethod?.id ?? xenditEwallet.id,
      paymentMethod: PaymentMethod.EWALLET,
      status: PaymentStatus.PENDING,
      amount: dto.amount,
      currency: dto.currency,
      paymentUrl: this.extractPaymentRequestUrl(xenditEwallet),
      xenditResponse: { ...xenditEwallet },
    });

    const saved = await this.transactionRepository.save(transaction);
    this.logger.info({ transactionId: saved.id, channelCode: dto.channelCode }, 'E-wallet created');
    return saved;
  }

  async enqueueWebhook(type: WebhookEventType, payload: WebhookJobData['payload']): Promise<void> {
    this.logger.info({ type, payload }, 'Adding webhook job to payment queue');
    const job = await this.paymentQueue.add(
      WEBHOOK_JOB,
      { type, payload },
      {
        attempts: MAX_RETRY_ATTEMPTS,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    this.logger.info({ jobId: job.id, type }, 'Webhook job added to payment queue');
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

  async processInvoiceWebhook(payload: XenditInvoiceWebhookDto): Promise<Transaction | null> {
    const transaction = await this.findInvoiceWebhookTransaction(payload);
    if (!transaction) {
      this.logger.warn({ externalId: payload.external_id, xenditId: payload.id }, 'Transaction not found for invoice webhook');
      return null;
    }

    if (transaction.status !== PaymentStatus.PENDING) {
      this.logger.info(
        { transactionId: transaction.id, externalId: transaction.externalId, xenditId: transaction.xenditId, status: transaction.status },
        'Skipping idempotent invoice webhook',
      );
      return transaction;
    }

    const statusMap: Record<string, PaymentStatus> = {
      PAID: PaymentStatus.PAID,
      EXPIRED: PaymentStatus.EXPIRED,
      SETTLED: PaymentStatus.SETTLED,
    };

    if (['PAID', 'SETTLED'].includes(payload.status)) this.validateInvoiceWebhookAmount(transaction, payload);

    transaction.status = statusMap[payload.status] ?? transaction.status;
    if (payload.paid_at) transaction.paidAt = new Date(payload.paid_at);

    await this.transactionRepository.save(transaction);

    // Invalidate dashboard cache when payment is completed
    if (statusMap[payload.status] === PaymentStatus.PAID || statusMap[payload.status] === PaymentStatus.SETTLED) {
      await this.dashboardCacheService.invalidate();
    }

    this.logger.info(
      { transactionId: transaction.id, externalId: transaction.externalId, xenditId: transaction.xenditId, status: payload.status },
      'Invoice webhook processed',
    );

    return transaction;
  }

  async processVirtualAccountWebhook(payload: XenditVirtualAccountWebhookDto): Promise<Transaction | null> {
    const transaction = await this.transactionRepository.findOne({
      where: { externalId: payload.external_id },
    });
    if (!transaction) {
      this.logger.warn({ externalId: payload.external_id }, 'Transaction not found for VA webhook');
      return null;
    }

    if (transaction.status !== PaymentStatus.PENDING) {
      this.logger.info({ externalId: payload.external_id }, 'Skipping idempotent VA webhook');
      return transaction;
    }

    this.validatePaymentAmount(transaction, payload.amount, 'VA webhook amount mismatch');
    transaction.status = PaymentStatus.PAID;
    transaction.paidAt = new Date(payload.transaction_timestamp);

    await this.transactionRepository.save(transaction);

    // Invalidate dashboard cache when payment is completed
    if (transaction.status === PaymentStatus.PAID) {
      await this.dashboardCacheService.invalidate();
    }

    this.logger.info({ transactionId: transaction.id }, 'VA webhook processed');
    return transaction;
  }

  async processQrisWebhook(payload: XenditQrisWebhookDto): Promise<Transaction | null> {
    const data = payload.data;
    const transaction = await this.transactionRepository.findOne({
      where: [{ externalId: data.reference_id }, { xenditId: data.qr_id ?? data.id }],
    });
    if (!transaction) {
      this.logger.warn({ referenceId: data.reference_id, xenditId: data.qr_id ?? data.id }, 'Transaction not found for QRIS webhook');
      return null;
    }

    if (transaction.status !== PaymentStatus.PENDING) {
      this.logger.info({ transactionId: transaction.id, referenceId: data.reference_id }, 'Skipping idempotent QRIS webhook');
      return transaction;
    }

    const statusMap: Record<string, PaymentStatus> = {
      SUCCEEDED: PaymentStatus.PAID,
      COMPLETED: PaymentStatus.PAID,
      EXPIRED: PaymentStatus.EXPIRED,
    };

    if (['SUCCEEDED', 'COMPLETED'].includes(data.status)) this.validatePaymentAmount(transaction, data.amount, 'QRIS webhook amount mismatch');

    transaction.status = statusMap[data.status] ?? transaction.status;
    if (transaction.status === PaymentStatus.PAID) transaction.paidAt = new Date(data.created ?? new Date().toISOString());

    await this.transactionRepository.save(transaction);

    // Invalidate dashboard cache when payment is completed
    if (transaction.status === PaymentStatus.PAID) await this.dashboardCacheService.invalidate();

    this.logger.info({ transactionId: transaction.id, referenceId: data.reference_id, status: data.status }, 'QRIS webhook processed');
    return transaction;
  }

  async processEwalletWebhook(payload: XenditEwalletWebhookDto): Promise<Transaction | null> {
    const data = payload.data;
    const transaction = await this.transactionRepository.findOne({
      where: [{ externalId: data.reference_id }, { xenditId: data.id }],
    });
    if (!transaction) {
      this.logger.warn({ referenceId: data.reference_id, xenditId: data.id }, 'Transaction not found for e-wallet webhook');
      return null;
    }

    if (transaction.status !== PaymentStatus.PENDING) {
      this.logger.info({ transactionId: transaction.id, referenceId: data.reference_id }, 'Skipping idempotent e-wallet webhook');
      return transaction;
    }

    const statusMap: Record<string, PaymentStatus> = {
      SUCCEEDED: PaymentStatus.PAID,
      FAILED: PaymentStatus.FAILED,
      VOIDED: PaymentStatus.FAILED,
    };

    if (data.status === 'SUCCEEDED') {
      this.validatePaymentAmount(transaction, data.capture_amount ?? data.charge_amount, 'E-wallet webhook amount mismatch');
    }

    transaction.status = statusMap[data.status] ?? transaction.status;
    if (transaction.status === PaymentStatus.PAID) {
      transaction.paidAt = new Date(data.updated ?? new Date().toISOString());
    }

    await this.transactionRepository.save(transaction);

    // Invalidate dashboard cache when payment is completed
    if (transaction.status === PaymentStatus.PAID) await this.dashboardCacheService.invalidate();

    this.logger.info({ transactionId: transaction.id, referenceId: data.reference_id, status: data.status }, 'E-wallet webhook processed');
    return transaction;
  }

  async markExpired(transactionId: string): Promise<Transaction | null> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
    });

    if (transaction?.status !== PaymentStatus.PENDING) return null;

    transaction.status = PaymentStatus.EXPIRED;
    return this.transactionRepository.save(transaction);
  }

  async findExpiredPending(): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: {
        status: PaymentStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
      take: 100,
    });
  }

  async incrementRetry(id: string): Promise<void> {
    await this.transactionRepository.increment({ id }, 'retryCount', 1);
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    return this.transactionRepository.findOne({ where: { id } });
  }

  async getTransactionByExternalId(externalId: string): Promise<Transaction | null> {
    return this.transactionRepository.findOne({ where: { externalId } });
  }

  async getTransactionByXenditId(xenditId: string): Promise<Transaction | null> {
    return this.transactionRepository.findOne({ where: { xenditId } });
  }

  async ping(): Promise<boolean> {
    try {
      await this.transactionRepository.count();
      return true;
    } catch {
      return false;
    }
  }

  private extractPaymentUrl(paymentMethod: XenditPaymentMethodResponse): string | undefined {
    return paymentMethod.actions?.find((action) => action.url)?.url;
  }

  private extractPaymentRequestUrl(paymentRequest: XenditPaymentRequestResponse): string | undefined {
    return paymentRequest.actions?.find((action) => action.url)?.url ?? undefined;
  }

  private extractPaymentRequestQrString(paymentRequest: XenditPaymentRequestResponse): string | undefined {
    return paymentRequest.actions?.find((action) => action.qrCode)?.qrCode ?? paymentRequest.paymentMethod?.qrCode?.channelProperties?.qrString;
  }

  private buildMockInvoiceTransaction(dto: CreateInvoiceDto): Transaction {
    this.logger.info('Create Mockup Transaction');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    return this.transactionRepository.create({
      externalId: dto.externalId,
      xenditId: `mock-invoice-${randomUUID()}`,
      paymentMethod: PaymentMethod.INVOICE,
      status: PaymentStatus.PENDING,
      amount: dto.amount,
      currency: dto.currency ?? 'IDR',
      payerEmail: dto.payerEmail,
      description: dto.description,
      paymentUrl: `mock://payments/invoice/${dto.externalId}`,
      expiresAt,
      xenditResponse: {
        provider: 'mock',
        externalId: dto.externalId,
        paymentUrl: `mock://payments/invoice/${dto.externalId}`,
        status: PaymentStatus.PENDING,
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

    return this.transactionRepository.create({
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

    return this.transactionRepository.create({
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

  private async findInvoiceWebhookTransaction(payload: XenditInvoiceWebhookDto): Promise<Transaction | null> {
    return this.transactionRepository.findOne({
      where: [{ externalId: payload.external_id }, { xenditId: payload.id }],
    });
  }

  private validateInvoiceWebhookAmount(transaction: Transaction, payload: XenditInvoiceWebhookDto): void {
    this.validatePaymentAmount(transaction, payload.paid_amount ?? payload.amount, 'Invoice webhook amount mismatch');
  }

  private validatePaymentAmount(transaction: Transaction, payloadAmount: number | undefined, message: string): void {
    const expectedAmount = Number(transaction.amount);
    const paidAmount = Number(payloadAmount);

    if (Number.isFinite(expectedAmount) && Number.isFinite(paidAmount) && expectedAmount === paidAmount) return;

    this.logger.error(
      {
        transactionId: transaction.id,
        externalId: transaction.externalId,
        xenditId: transaction.xenditId,
        expectedAmount,
        paidAmount,
      },
      message,
    );
    throw new BadRequestException(message);
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

  private mapPaymentRequestEwalletChannel(channelCode: CreateEwalletDto['channelCode']): PaymentRequestEWalletChannelCode {
    switch (channelCode) {
      case EwalletType.OVO:
        return PaymentRequestEWalletChannelCode.Ovo;
      case EwalletType.DANA:
        return PaymentRequestEWalletChannelCode.Dana;
      case EwalletType.SHOPEEPAY:
        return PaymentRequestEWalletChannelCode.Shopeepay;
      case EwalletType.LINKAJA:
        return PaymentRequestEWalletChannelCode.Linkaja;
      case EwalletType.GOPAY:
        throw new BadRequestException('GOPAY is not supported by the current Xendit payment request API');
      default:
        return PaymentRequestEWalletChannelCode.Shopeepay;
    }
  }

  private getPaymentMethodClient(): XenditPaymentMethodApi {
    if (!this.paymentMethod) throw new Error('Xendit payment method client is not initialized');
    return this.paymentMethod;
  }

  private getPaymentRequestClient(): XenditPaymentRequestApiLike {
    if (!this.paymentRequest) throw new Error('Xendit payment request client is not initialized');
    return this.paymentRequest;
  }
}

interface XenditPaymentRequestApiLike {
  createPaymentRequest(requestParameters?: XenditPaymentRequestRequest): Promise<XenditPaymentRequestResponse>;
}
