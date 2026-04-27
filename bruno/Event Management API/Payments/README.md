# Payments API Tests

This directory contains Bruno test collections for the Payments module API endpoints.

## Test Files

### Payment Creation Tests

1. **Create Invoice** - Tests invoice payment creation
2. **Create Virtual Account** - Tests VA creation (default BCA)
3. **Create Virtual Account BNI** - Tests BNI VA creation
4. **Create QRIS** - Tests QR code payment creation
5. **Create E-Wallet** - Tests OVO e-wallet payment
6. **Create E-Wallet DANA** - Tests DANA e-wallet payment
7. **Create E-Wallet ShopeePay** - Tests ShopeePay e-wallet payment

### Query Tests

8. **Get Transaction** - Tests fetching transaction by ID
9. **Get Transaction by External ID** - Tests fetching by external ID

### System Tests

10. **Webhook Test** - Tests webhook endpoint with sample data
11. **Health Check** - Tests payment service health

## Setup

### Environment Variables

Make sure your Bruno environment has these variables set:

```json
{
  "baseUrl": "http://localhost:3000",
  "authToken": "your_jwt_token_here",
  "xenditCallbackToken": "your_xendit_webhook_token",
  "transactionId": "transaction_id_from_previous_test",
  "externalId": "external_id_from_previous_test"
}
```

### Authentication

Most endpoints require authentication. Set the `authToken` variable with a valid JWT token from the auth endpoint.

### Getting Auth Token

1. Run the `Login` test from the Auth folder
2. Copy the `accessToken` from the response
3. Set it as the `authToken` variable in your environment

## Test Workflow

### 1. Create Payment Tests

Run any of the create payment tests to generate transactions:

- Start with **Create Invoice** for basic invoice testing
- Try **Create Virtual Account** for bank transfer testing
- Use **Create QRIS** for QR code testing
- Test e-wallets with **Create E-Wallet** variants

### 2. Query Tests

After creating a payment:

- Copy the `id` from the response
- Set it as the `transactionId` variable
- Run **Get Transaction** to test fetching

- Copy the `externalId` from the response
- Set it as the `externalId` variable
- Run **Get Transaction by External ID** to test fetching

### 3. Webhook Testing

Use the **Webhook Test** to simulate webhook callbacks from Xendit:

- Update the webhook payload with real transaction data
- Ensure the `x-callback-token` header matches your Xendit webhook token
- Test different webhook events (paid, expired, failed)

### 4. Health Check

Run **Health Check** to verify the payment service is running correctly.

## Expected Responses

### Successful Payment Creation

```json
{
  "id": "uuid-string",
  "externalId": "INV-123",
  "xenditId": "xendit-id",
  "paymentMethod": "INVOICE",
  "status": "PENDING",
  "amount": 100000,
  "currency": "IDR",
  "paymentUrl": "https://checkout.xendit.co/...",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Successful Transaction Query

```json
{
  "id": "uuid-string",
  "externalId": "INV-123",
  "status": "PAID",
  "paymentMethod": "INVOICE",
  "amount": 100000,
  "paidAt": "2024-01-15T10:35:00Z",
  "xenditResponse": {...}
}
```

## Testing Different Scenarios

### Invoice Payments

- Test with different amounts
- Test with and without redirect URLs
- Test different currencies

### Virtual Accounts

- Test all supported banks (BCA, BNI, BRI, MANDIRI, PERMATA, BSI)
- Test different customer names
- Test various amounts

### E-Wallet Payments

- Test all supported channels (OVO, DANA, SHOPEEPAY, LINKAJA)
- Test with and without return URLs
- Test mobile numbers where applicable

### Error Scenarios

- Test with invalid bank codes
- Test with duplicate external IDs
- Test with invalid amounts
- Test without authentication

## Tips

1. **Use Variables**: Store response data in variables for chained tests
2. **Check Responses**: Verify status codes and response structures
3. **Test Idempotency**: Retry the same request to test duplicate handling
4. **Monitor Logs**: Check application logs for detailed error information
5. **Clean Up**: Use unique external IDs to avoid conflicts

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check your `authToken` variable
2. **400 Bad Request**: Validate request body format
3. **500 Server Error**: Check application logs
4. **Xendit Errors**: Verify Xendit configuration

### Debug Steps

1. Check the Bruno console for response details
2. Verify environment variables are set correctly
3. Check the application logs for error messages
4. Ensure the payment service is running
5. Validate Xendit API credentials

## Next Steps

- Add more edge case tests
- Test webhook retry logic
- Add performance tests
- Test payment expiry scenarios
