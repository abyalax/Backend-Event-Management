import type { CreateInvoiceOperationRequest, InvoiceApi } from 'xendit-node/invoice/apis/Invoice';
import type { CreatePaymentMethodRequest, PaymentMethodApi } from 'xendit-node/payment_method/apis/PaymentMethod';
import type { CreatePaymentRequestRequest, PaymentRequestApi } from 'xendit-node/payment_request/apis/PaymentRequest';

import type { Invoice } from 'xendit-node/invoice/models';
import type { PaymentMethod } from 'xendit-node/payment_method/models';
import type { PaymentRequest } from 'xendit-node/payment_request/models';

export type XenditInvoiceApi = InvoiceApi;
export type XenditPaymentMethodApi = PaymentMethodApi;
export type XenditPaymentRequestApi = PaymentRequestApi;
export type XenditInvoiceRequest = CreateInvoiceOperationRequest;
export type XenditInvoiceResponse = Invoice;
export type XenditPaymentMethodRequest = CreatePaymentMethodRequest;
export type XenditPaymentMethodResponse = PaymentMethod;
export type XenditPaymentRequestRequest = CreatePaymentRequestRequest;
export type XenditPaymentRequestResponse = PaymentRequest;
