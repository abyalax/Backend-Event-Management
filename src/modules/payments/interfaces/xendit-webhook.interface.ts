import { WebhookEventType } from '../payment.enum';
import { XenditInvoiceWebhookDto } from '../dto/xendit-invoice-webhook.dto';
import { XenditVirtualAccountWebhookDto } from '../dto/xendit-virtual-account-webhook.dto';
import { XenditQrisWebhookDto } from '../dto/xendit-qris-webhook.dto';
import { XenditEwalletWebhookDto } from '../dto/xendit-ewallet-webhook.dto';

type XenditWebhookPayload = XenditInvoiceWebhookDto | XenditVirtualAccountWebhookDto | XenditQrisWebhookDto | XenditEwalletWebhookDto;
export interface WebhookJobData {
  type: WebhookEventType;
  payload: XenditWebhookPayload;
  transactionId?: string;
  externalId?: string;
}

export interface ExpiryJobData {
  transactionId: string;
  externalId: string;
}
