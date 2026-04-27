import { WebhookEventType } from '../payment.enum';

export interface XenditInvoiceWebhook {
  id: string;
  external_id: string;
  status: string;
  amount: number;
  paid_amount?: number;
  paid_at?: string;
  payment_method?: string;
  payment_channel?: string;
  payer_email?: string;
  description?: string;
}

export interface XenditVirtualAccountWebhook {
  id: string;
  external_id: string;
  bank_code: string;
  account_number: string;
  amount: number;
  transaction_timestamp: string;
  merchant_code: string;
  payment_id: string;
}

export interface XenditQrisWebhook {
  id: string;
  reference_id: string;
  status: string;
  amount: number;
  qr_string?: string;
  expires_at?: string;
  payment_details?: {
    receipt_id: string;
    source: string;
  };
}

export interface XenditEwalletWebhook {
  event: string;
  data: {
    id: string;
    reference_id: string;
    status: string;
    currency: string;
    charge_amount: number;
    capture_amount: number;
    checkout_method: string;
    channel_code: string;
    channel_properties: Record<string, string>;
    actions?: Record<string, string>;
    is_redirect_customer: boolean;
    failure_code?: string;
    created: string;
    updated: string;
  };
}

export type XenditWebhookPayload = XenditInvoiceWebhook | XenditVirtualAccountWebhook | XenditQrisWebhook | XenditEwalletWebhook;

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
