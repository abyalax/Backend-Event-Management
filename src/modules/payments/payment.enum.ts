export enum PaymentMethod {
  INVOICE = 'INVOICE',
  VIRTUAL_ACCOUNT = 'VIRTUAL_ACCOUNT',
  QRIS = 'QRIS',
  EWALLET = 'EWALLET',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
  SETTLED = 'SETTLED',
}

export enum EwalletType {
  OVO = 'OVO',
  GOPAY = 'GOPAY',
  DANA = 'DANA',
  SHOPEEPAY = 'SHOPEEPAY',
  LINKAJA = 'LINKAJA',
}

export enum VirtualAccountBank {
  BCA = 'BCA',
  BNI = 'BNI',
  BRI = 'BRI',
  MANDIRI = 'MANDIRI',
  PERMATA = 'PERMATA',
  BSI = 'BSI',
}

export enum WebhookEventType {
  INVOICE = 'INVOICE',
  VIRTUAL_ACCOUNT = 'VIRTUAL_ACCOUNT',
  QRIS = 'QRIS',
  EWALLET = 'EWALLET',
}
