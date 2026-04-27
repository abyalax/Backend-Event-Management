import type { CreateInvoiceOperationRequest, InvoiceApi } from 'xendit-node/invoice/apis/Invoice';
import type { CreatePaymentMethodRequest, PaymentMethodApi } from 'xendit-node/payment_method/apis/PaymentMethod';

import type { Invoice } from 'xendit-node/invoice/models';
import type { PaymentMethod } from 'xendit-node/payment_method/models';

export type XenditInvoiceApi = InvoiceApi;
export type XenditPaymentMethodApi = PaymentMethodApi;
export type XenditInvoiceRequest = CreateInvoiceOperationRequest;
export type XenditInvoiceResponse = Invoice;
export type XenditPaymentMethodRequest = CreatePaymentMethodRequest;
export type XenditPaymentMethodResponse = PaymentMethod;
