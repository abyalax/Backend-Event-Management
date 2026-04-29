import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Post, UnauthorizedException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PaymentService } from './payment.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateVirtualAccountDto } from './dto/create-virtual-account.dto';
import { CreateQrisDto } from './dto/create-qris.dto';
import { CreateEwalletDto } from './dto/create-ewallet.dto';
import { WebhookEventType } from './payment.enum';
import { XENDIT_CALLBACK_TOKEN_HEADER } from './payment.constant';
import { XenditInvoiceWebhookDto } from './dto/xendit-invoice-webhook.dto';
import { XenditVirtualAccountWebhookDto } from './dto/xendit-virtual-account-webhook.dto';
import { XenditQrisWebhookDto } from './dto/xendit-qris-webhook.dto';
import { XenditEwalletWebhookDto } from './dto/xendit-ewallet-webhook.dto';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly logger: PinoLogger,
    private readonly paymentService: PaymentService,
    @Inject(CONFIG_SERVICE)
    private readonly configService: ConfigService,
  ) {}

  @Post('invoice')
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.paymentService.createInvoice(dto);
  }

  @Post('virtual-account')
  createVirtualAccount(@Body() dto: CreateVirtualAccountDto) {
    return this.paymentService.createVirtualAccount(dto);
  }

  @Post('qris')
  createQris(@Body() dto: CreateQrisDto) {
    return this.paymentService.createQris(dto);
  }

  @Post('ewallet')
  createEwallet(@Body() dto: CreateEwalletDto) {
    return this.paymentService.createEwallet(dto);
  }

  @Get(':id')
  getTransaction(@Param('id') id: string) {
    return this.paymentService.getTransaction(id);
  }

  @Post('webhook/invoice')
  async handleInvoiceWebhook(@Headers(XENDIT_CALLBACK_TOKEN_HEADER) token: string, @Body() payload: XenditInvoiceWebhookDto) {
    this.validateToken(token);
    await this.paymentService.enqueueWebhook(WebhookEventType.INVOICE, payload);
    return { received: true };
  }

  @Post('webhook/virtual-account')
  async handleVirtualAccountWebhook(@Headers(XENDIT_CALLBACK_TOKEN_HEADER) token: string, @Body() payload: XenditVirtualAccountWebhookDto) {
    this.validateToken(token);
    await this.paymentService.enqueueWebhook(WebhookEventType.VIRTUAL_ACCOUNT, payload);
    return { received: true };
  }

  @Post('webhook/qris')
  async handleQrisWebhook(@Headers(XENDIT_CALLBACK_TOKEN_HEADER) token: string, @Body() payload: XenditQrisWebhookDto) {
    this.validateToken(token);
    await this.paymentService.enqueueWebhook(WebhookEventType.QRIS, payload);
    return { received: true };
  }

  @Post('webhook/ewallet')
  async handleEwalletWebhook(@Headers(XENDIT_CALLBACK_TOKEN_HEADER) token: string, @Body() payload: XenditEwalletWebhookDto) {
    this.validateToken(token);
    await this.paymentService.enqueueWebhook(WebhookEventType.EWALLET, payload);
    return { received: true };
  }

  @Post('webhook/expiry')
  async handleExpiryWebhook(@Headers(XENDIT_CALLBACK_TOKEN_HEADER) token: string, @Body() payload: XenditInvoiceWebhookDto) {
    this.validateToken(token);
    if (payload.status !== 'EXPIRED') return { skipped: true };
    await this.paymentService.enqueueExpiry(payload.id, payload.external_id);
    return { received: true };
  }

  private validateToken(token: string): void {
    if (!token) {
      this.logger.warn('Webhook received without callback token');
      throw new BadRequestException('Missing callback token');
    }
    if (token !== this.configService.get('XENDIT_CALLBACK_TOKEN')) {
      this.logger.warn('Webhook received with invalid callback token');
      throw new UnauthorizedException('Invalid callback token');
    }
  }
}
