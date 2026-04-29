# E2E Test Suite for Ticket and QR Code System

This document provides comprehensive documentation for the end-to-end test suite covering the complete ticket and QR code flow implementation.

## Test Files Overview

### 1. `ticket-qr-flow.e2e-spec.ts`
**Purpose**: Complete end-to-end flow testing from ticket purchase to QR validation

**Coverage**:
- Complete ticket purchase flow simulation
- PDF generation queue processing
- Email distribution workflow
- QR code generation and validation
- Atomic ticket validation
- Error handling and edge cases

**Key Test Scenarios**:
- Full flow: Purchase → PDF → Email → QR → Check-in
- Invalid QR code handling
- QR signature validation
- Duplicate PDF generation prevention
- Email sending failure handling
- QR code tampering prevention
- Concurrent check-in attempts

### 2. `qr-code-validation.e2e-spec.ts`
**Purpose**: Focused testing of QR code generation and validation security

**Coverage**:
- QR code generation with proper encoding
- Signature validation and tampering detection
- Single-use enforcement
- Security attack prevention
- Edge case handling

**Key Test Scenarios**:
- Valid QR code generation and validation
- Tampered QR code rejection
- Signature validation
- Concurrent validation attempts
- Malformed QR code handling
- Special character support

### 3. `pdf-generation.e2e-spec.ts`
**Purpose**: PDF generation process and storage testing

**Coverage**:
- PDF generation queue processing
- MinIO storage integration
- PDF content validation
- File naming and path conventions
- Performance testing

**Key Test Scenarios**:
- PDF job queue processing
- Idempotent PDF generation
- Storage path validation
- Special character handling
- Bulk PDF generation
- Error handling

### 4. `email-distribution.e2e-spec.ts`
**Purpose**: Email sending workflow and template testing

**Coverage**:
- Email queue processing
- Template generation
- Special character handling
- Bulk email sending
- Error scenarios

**Key Test Scenarios**:
- Email job queue processing
- Template content validation
- Special character support
- Virtual event handling
- Bulk email performance
- Failure scenarios

## Test Environment Setup

### Prerequisites
1. **Database**: PostgreSQL with test schema
2. **Redis**: For BullMQ queue processing
3. **MinIO**: For PDF storage (mocked in tests)
4. **Environment**: Test environment variables

### Test Configuration
```typescript
// Jest configuration for e2e tests
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.e2e-spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.e2e.ts'],
};
```

### Test Data Management
- **Isolation**: Each test runs in isolation with clean database state
- **Cleanup**: Automatic cleanup after each test
- **Fixtures**: Reusable test data creation
- **Mocking**: External services mocked where appropriate

## Running the Tests

### Individual Test Files
```bash
# Run complete flow tests
pnpm test test/ticket-qr-flow.e2e-spec.ts

# Run QR validation tests
pnpm test test/qr-code-validation.e2e-spec.ts

# Run PDF generation tests
pnpm test test/pdf-generation.e2e-spec.ts

# Run email distribution tests
pnpm test test/email-distribution.e2e-spec.ts
```

### All E2E Tests
```bash
# Run all e2e tests
pnpm test --testPathPattern=e2e-spec.ts

# Run with coverage
pnpm test --testPathPattern=e2e-spec.ts --coverage

# Run with verbose output
pnpm test --testPathPattern=e2e-spec.ts --verbose
```

### Test Environment Variables
```bash
# Required environment variables for e2e tests
NODE_ENV=test
DATABASE_URL=postgresql://user:password@localhost:5432/test_db
REDIS_HOST=localhost
REDIS_PORT=6379
QR_SECRET=test_secret
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

## Test Coverage Areas

### ✅ Complete Flow Testing
- [x] Ticket purchase simulation
- [x] PDF generation workflow
- [x] Email distribution process
- [x] QR code validation
- [x] Check-in process

### ✅ Security Testing
- [x] QR code tampering prevention
- [x] Signature validation
- [x] Single-use enforcement
- [x] Atomic operations
- [x] Input validation

### ✅ Performance Testing
- [x] Concurrent operations
- [x] Bulk processing
- [x] Queue performance
- [x] Database operations

### ✅ Error Handling
- [x] Invalid data handling
- [x] Service unavailability
- [x] Network failures
- [x] Data corruption

### ✅ Edge Cases
- [x] Special characters
- [x] Empty/null values
- [x] Very long strings
- [x] Invalid formats

## Test Data Examples

### Sample Event
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "Test Event",
  "description": "Test Description",
  "location": "Test Location",
  "startDate": "2026-05-01T10:00:00Z",
  "endDate": "2026-05-01T12:00:00Z",
  "maxAttendees": 100,
  "status": "published"
}
```

### Sample QR Code Format
```
base64(ticketId:eventId:signature)
```

### Sample Email Content
```html
<!DOCTYPE html>
<html>
<head>
  <title>Your Ticket for Test Event</title>
</head>
<body>
  <h1>Hello Test User</h1>
  <p>Your ticket for Test Event</p>
  <a href="http://localhost:9000/tickets-public/ticket.pdf">Download PDF</a>
</body>
</html>
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure PostgreSQL is running
   - Check database URL configuration
   - Verify test database exists

2. **Redis Connection Errors**
   - Ensure Redis is running
   - Check Redis host and port
   - Verify Redis authentication

3. **Queue Processing Issues**
   - Check BullMQ configuration
   - Verify queue names match
   - Ensure workers are running

4. **MinIO Connection Issues**
   - Ensure MinIO is running (or mocked)
   - Check bucket configuration
   - Verify access credentials

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* pnpm test --testPathPattern=e2e-spec.ts

# Run specific test with debug
DEBUG=bullmq* pnpm test test/qr-code-validation.e2e-spec.ts
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
      redis:
        image: redis:6
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm run build
      - run: pnpm test --testPathPattern=e2e-spec.ts
```

## Best Practices

### Test Organization
- **Descriptive test names**: Clearly indicate what is being tested
- **Test isolation**: Each test should be independent
- **Cleanup**: Proper cleanup after each test
- **Fixtures**: Reusable test data setup

### Test Data Management
- **Minimal data**: Create only necessary test data
- **Realistic data**: Use realistic test values
- **Edge cases**: Include boundary conditions
- **Security**: Test with malicious inputs

### Error Testing
- **Expected failures**: Test known failure scenarios
- **Error messages**: Verify proper error responses
- **Graceful degradation**: Ensure system handles failures
- **Recovery**: Test recovery mechanisms

## Future Enhancements

### Planned Test Additions
- [ ] Load testing with high volume
- [ ] Cross-browser compatibility tests
- [ ] Mobile device testing
- [ ] Accessibility testing
- [ ] Performance benchmarking

### Test Automation
- [ ] Scheduled test runs
- [ ] Automated reporting
- [ ] Performance monitoring
- [ ] Test data generation
- [ ] CI/CD integration

## Conclusion

This comprehensive e2e test suite provides thorough coverage of the ticket and QR code system, ensuring:

1. **Functionality**: All features work as expected
2. **Security**: QR codes are secure and tamper-proof
3. **Performance**: System handles expected load
4. **Reliability**: System handles errors gracefully
5. **Maintainability**: Tests are easy to understand and maintain

The test suite serves as both validation of the current implementation and a safety net for future changes, ensuring the ticket and QR code system remains robust and reliable.
