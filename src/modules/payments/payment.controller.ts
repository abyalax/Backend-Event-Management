import { BadRequestException, Body, Controller, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PaymentService } from './payment.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateVirtualAccountDto } from './dto/create-virtual-account.dto';
import { CreateQrisDto } from './dto/create-qris.dto';
import { CreateEwalletDto } from './dto/create-ewallet.dto';
import { WebhookEventType } from './payment.enum';
import { XENDIT_CALLBACK_TOKEN_HEADER } from './payment.constant';
import { XenditEwalletWebhook, XenditInvoiceWebhook, XenditQrisWebhook, XenditVirtualAccountWebhook } from './interfaces/xendit-webhook.interface';
import { ConfigService } from '~/infrastructure/config/config.provider';

@Controller('payments')
export class PaymentController {
  private readonly callbackToken: string;

  constructor(
    @InjectPinoLogger(PaymentController.name)
    private readonly logger: PinoLogger,
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {
    this.callbackToken = this.configService.get('XENDIT_CALLBACK_TOKEN');
  }

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
  async handleInvoiceWebhook(@Headers(XENDIT_CALLBACK_TOKEN_HEADER) token: string, @Body() payload: XenditInvoiceWebhook) {
    this.validateToken(token);
    await this.paymentService.enqueueWebhook(WebhookEventType.INVOICE, payload);
    return { received: true };
  }

  @Post('webhook/virtual-account')
  async handleVirtualAccountWebhook(@Headers(XENDIT_CALLBACK_TOKEN_HEADER) token: string, @Body() payload: XenditVirtualAccountWebhook) {
    this.validateToken(token);
    await this.paymentService.enqueueWebhook(WebhookEventType.VIRTUAL_ACCOUNT, payload);
    return { received: true };
  }

  @Post('webhook/qris')
  async handleQrisWebhook(@Headers(XENDIT_CALLBACK_TOKEN_HEADER) token: string, @Body() payload: XenditQrisWebhook) {
    this.validateToken(token);
    await this.paymentService.enqueueWebhook(WebhookEventType.QRIS, payload);
    return { received: true };
  }

  @Post('webhook/ewallet')
  async handleEwalletWebhook(@Headers(XENDIT_CALLBACK_TOKEN_HEADER) token: string, @Body() payload: XenditEwalletWebhook) {
    this.validateToken(token);
    await this.paymentService.enqueueWebhook(WebhookEventType.EWALLET, payload);
    return { received: true };
  }

  @Post('webhook/expiry')
  async handleExpiryWebhook(@Headers(XENDIT_CALLBACK_TOKEN_HEADER) token: string, @Body() payload: XenditInvoiceWebhook) {
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
    if (token !== this.callbackToken) {
      this.logger.warn('Webhook received with invalid callback token');
      throw new UnauthorizedException('Invalid callback token');
    }
  }
}
