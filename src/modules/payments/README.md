# Payments Module

The payments module handles all payment processing operations using Xendit payment gateway. It supports multiple payment methods including invoices, virtual accounts, QRIS, and e-wallets.

## Features

- **Invoice Payments**: Create and manage payment invoices
- **Virtual Accounts**: Generate fixed virtual accounts for bank transfers
- **QRIS Payments**: Create QR codes for QRIS payments
- **E-Wallet Payments**: Support for OVO, DANA, ShopeePay, and LinkAja
- **Webhook Processing**: Handle payment status updates from Xendit
- **Payment Expiry**: Automatic expiry handling for pending payments
- **Email Notifications**: Send payment confirmation and expiry notifications

## Architecture

### Core Components

- **PaymentService**: Main service for payment operations
- **PaymentController**: HTTP endpoints for payment APIs
- **PaymentExpiryProcessor**: Background job processor for payment expiry
- **PaymentWebhookProcessor**: Background job processor for webhook handling
- **PaymentModule**: NestJS module configuration

### Payment Methods

1. **Invoice** (`PaymentMethod.INVOICE`)
   - Creates payment invoices with redirect URLs
   - Supports success/failure redirects
   - Automatic expiry handling

2. **Virtual Account** (`PaymentMethod.VIRTUAL_ACCOUNT`)
   - Fixed virtual accounts for various banks
   - Supported banks: BCA, BNI, BRI, Mandiri, Permata, BSI
   - One-time use virtual accounts

3. **QRIS** (`PaymentMethod.QRIS`)
   - Dynamic QR code generation
   - Standard QRIS payment processing

4. **E-Wallet** (`PaymentMethod.EWALLET`)
   - OVO, DANA, ShopeePay, LinkAja support
   - Mobile-first payment experience

## API Endpoints

### Invoice Payment

```http
POST /payments/invoice
```

**Request Body:**

```typescript
{
  externalId: string;
  amount: number;
  payerEmail: string;
  description?: string;
  currency?: string; // Default: 'IDR'
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
}
```

### Virtual Account

```http
POST /payments/virtual-account
```

**Request Body:**

```typescript
{
  externalId: string;
  bankCode: 'BCA' | 'BNI' | 'BRI' | 'MANDIRI' | 'PERMATA' | 'BSI';
  name: string;
  expectedAmount: number;
  description?: string;
}
```

### QRIS Payment

```http
POST /payments/qris
```

**Request Body:**

```typescript
{
  referenceId: string;
  amount: number;
  currency?: string; // Default: 'IDR'
}
```

### E-Wallet Payment

```http
POST /payments/ewallet
```

**Request Body:**

```typescript
{
  referenceId: string;
  currency: string;
  amount: number;
  channelCode: 'OVO' | 'DANA' | 'SHOPEEPAY' | 'LINKAJA';
  channelProperties?: {
    successReturnUrl?: string;
    failureReturnUrl?: string;
    cancelReturnUrl?: string;
    mobileNumber?: string;
    cashtag?: string;
  };
}
```

### Get Transaction

```http
GET /payments/transactions/:id
```

### Get Transaction by External ID

```http
GET /payments/transactions/external/:externalId
```

## Payment Status Flow

```
PENDING → PAID/SETTLED (Success)
    ↓
   EXPIRED (Timeout)
    ↓
   FAILED (Error)
```

### Status Definitions

- **PENDING**: Payment created, awaiting payment
- **PAID**: Payment received and confirmed
- **SETTLED**: Payment settled in bank account
- **EXPIRED**: Payment window expired
- **FAILED**: Payment failed due to error

## Webhook Handling

The module processes webhooks from Xendit to update payment status:

### Webhook Types

- **INVOICE**: Invoice payment status updates
- **VIRTUAL_ACCOUNT**: VA payment notifications
- **QRIS**: QRIS payment confirmations
- **EWALLET**: E-wallet payment status

### Webhook Processing

1. Receive webhook from Xendit
2. Validate webhook token
3. Queue webhook for background processing
4. Update transaction status
5. Send email notification for successful payments

## Background Jobs

### Payment Expiry Job

- Runs every 5 minutes
- Finds expired pending transactions
- Marks transactions as expired
- Sends expiry email notifications

### Webhook Processing Job

- Processes webhooks asynchronously
- Handles retries for failed processing
- Ensures webhook delivery

## Configuration

### Environment Variables

```bash
# Xendit Configuration
XENDIT_SECRET_KEY=your_xendit_secret_key
XENDIT_CALLBACK_TOKEN=your_webhook_callback_token

# Email Configuration (for notifications)
MAILPIT_HOST=localhost
MAILPIT_PORT=1025
MAILPIT_USER=user
MAILPIT_PASSWORD=pass
MAILPIT_FROM_EMAIL=noreply@yourapp.com
MAILPIT_FROM_NAME=Your App
```

## Database Schema

### Transactions Table

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  externalId VARCHAR(255) UNIQUE NOT NULL,
  xenditId VARCHAR(255),
  paymentMethod VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'IDR',
  payerEmail VARCHAR(255),
  description TEXT,
  paymentUrl TEXT,
  paidAt TIMESTAMP,
  expiresAt TIMESTAMP,
  retryCount INTEGER DEFAULT 0,
  xenditResponse JSONB,
  metadata JSONB,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

## Error Handling

### Common Errors

1. **Invalid Bank Code**: Unsupported virtual account bank
2. **Invalid Channel Code**: Unsupported e-wallet provider
3. **Duplicate External ID**: Transaction already exists
4. **Xendit API Errors**: Payment gateway issues
5. **Validation Errors**: Invalid request data

### Error Responses

```typescript
{
  statusCode: 400,
  message: "Invalid bank code. Supported: BCA, BNI, BRI, MANDIRI, PERMATA, BSI",
  error: "Bad Request"
}
```

## Security Considerations

1. **Webhook Validation**: Always validate webhook tokens
2. **Input Validation**: Strict validation on all inputs
3. **Rate Limiting**: Apply rate limits to payment endpoints
4. **HTTPS**: Use HTTPS for all payment endpoints
5. **Secret Management**: Secure storage of API keys

## Monitoring and Logging

### Logging Levels

- **INFO**: Payment creation, status updates, webhook processing
- **WARN**: Retry attempts, missing transactions
- **ERROR**: API failures, processing errors

### Health Checks

```http
GET /payments/health
```

Returns service health status including database connectivity.

## Testing

### Unit Tests

- Service layer testing
- DTO validation testing
- Utility function testing

### Integration Tests

- Full payment flow testing
- Webhook processing testing
- Error scenario testing

## Best Practices

1. **Idempotency**: Handle duplicate webhook calls gracefully
2. **Retry Logic**: Implement exponential backoff for API calls
3. **Status Tracking**: Always update payment status
4. **Audit Trail**: Log all payment operations
5. **Graceful Degradation**: Handle Xendit downtime appropriately

## Troubleshooting

### Common Issues

1. **Payment Not Updating**: Check webhook processing logs
2. **Duplicate Transactions**: Verify external ID uniqueness
3. **Expiry Not Working**: Check cron job configuration
4. **Email Not Sending**: Verify email configuration

### Debug Commands

```bash
# Check payment service logs
pnpm logs payments

# Test webhook endpoint
curl -X POST /payments/webhook \
  -H "x-callback-token: your_token" \
  -d '{"event":"invoice.paid","data":{...}}'
```

## Dependencies

- **xendit-node**: Xendit Node.js SDK
- **@nestjs/bullmq**: Background job processing
- **typeorm**: Database ORM
- **nestjs-pino**: Structured logging

## Version History

- **v1.0.0**: Initial implementation with basic payment methods
- **v1.1.0**: Added e-wallet support and webhook processing
- **v1.2.0**: Enhanced error handling and retry logic
- **v1.3.0**: Added payment expiry handling and email notifications
