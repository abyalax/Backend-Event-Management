# Feature Context: Ticket PDF + QR Code System

---

# MODULE 1: PDF Module (Ticket PDF Generation & Distribution)

## 1. Objective

Generate a ticket PDF after successful payment, embed QR code, store in object storage (MinIO public bucket), and distribute via email link.

---

## 2. Existing System Context

- NestJS backend
- BullMQ (queue system already available)
- Email service available
- MinIO available
- QR Code generated from separate module (QR Module)

---

## 3. High-Level Flow

```

Payment Success
↓
TicketService
↓
Queue: generate-ticket-pdf
↓
PDF Worker
├── Fetch ticket + event + user
├── Generate QR (from QR Module)
├── Generate PDF
├── Upload to MinIO (public bucket)
└── Save pdfUrl
↓
Queue: send-email
↓
Email Worker
└── Send email with PDF link

```

---

## 4. Storage Strategy

### Bucket

```

tickets-public

```

### Path Convention

```

tickets/{eventId}/{randomHash}.pdf

```

### DB Field

```ts
ticket.pdfUrl: string
```

---

## 5. PDF Content

- Event name, date, location
- User name
- Ticket ID
- QR Code
- Optional: watermark (user/email)

---

## 6. Queue Design

### Job: Generate PDF

```ts
queue.add(
  'generate-ticket-pdf',
  { ticketId },
  {
    jobId: `generate-ticket:${ticketId}`,
  },
);
```

### Job: Send Email

```ts
queue.add('send-ticket-email', { ticketId });
```

---

## 7. Idempotency

- Use `jobId = generate-ticket:${ticketId}`
- Before generating:

```ts
if (ticket.pdfUrl) return;
```

---

## 8. Email Strategy

- Send **direct public URL**
- No authentication required
- Optional: attach PDF (not required)

---

## 9. Edge Cases

### Duplicate Payment Webhook

- Prevent via idempotent jobId
- Check `pdfUrl` before generating

---

### PDF Generation Failure

- Retry via BullMQ
- Do not send email until success

---

### Upload Failure (MinIO)

- Retry job
- Fail-safe: no email sent

---

### User Re-download

- Always reuse `pdfUrl`
- No regeneration

---

### Event Updated

- Usually ignore (PDF static)
- Optional: regenerate manually (admin)

---

### File Naming Collision

- Avoid predictable naming
- Use random hash (UUID)

---

## 10. Constraints / Decisions

- Public bucket (no signed URL, no auth)
- PDF generated once (not on-demand)
- Distribution via direct link
- Security handled in QR Module

---

# MODULE 2: QR Code Module (Validation & Check-in)

## 1. Objective

Provide secure, tamper-proof QR code generation and enforce **single-use ticket validation** at check-in.

---

## 2. Design Principle

- PDF is **not secure**
- QR validation is the **only source of truth**
- Enforce **one-time usage at database level**

---

## 3. QR Payload Design

### Minimal Payload

```json
{
  "ticketId": "uuid",
  "eventId": "uuid"
}
```

---

## 4. Signature Strategy (HMAC)

```ts
signature = HMAC_SHA256(ticketId + eventId, SECRET);
```

### Final QR Content

```
base64(ticketId:eventId:signature)
```

---

## 5. QR Generation

```ts
QRCodeService.generate(ticketId, eventId) → string
```

Used by:

- PDF Module
- Any future ticket representation

---

## 6. Check-in Flow

```
Scan QR
   ↓
Decode payload
   ↓
Verify signature
   ↓
Fetch ticket from DB
   ↓
Atomic validation
   ↓
Mark as used
   ↓
Return result
```

---

## 7. Database Requirement

```ts
Ticket {
  id: string
  eventId: string
  userId: string

  isUsed: boolean
  usedAt?: Date
}
```

---

## 8. Atomic Validation (Critical)

```sql
UPDATE tickets
SET is_used = true, used_at = now()
WHERE id = :ticketId AND is_used = false
```

### Result Handling

- affectedRows = 1 → VALID
- affectedRows = 0 → ALREADY_USED

---

## 9. API Contract

### Endpoint

```
POST /check-in
```

### Request

```json
{
  "qr": "encoded_string"
}
```

### Response

```json
// success
{
  "status": "VALID"
}

// already used
{
  "status": "ALREADY_USED"
}

// invalid
{
  "status": "INVALID"
}
```

---

## 10. Edge Cases

### QR Forgery Attempt

- Invalid signature → reject

---

### Ticket Not Found

- Reject (tampered QR)

---

### Duplicate Scan (Race Condition)

- Prevented via atomic update

---

### Multiple Device Scan

- First scan wins
- Others get ALREADY_USED

---

### Shared PDF / Screenshot

- Allowed
- Controlled at validation level

---

### Clock Issues

- No dependency on client time

---

## 11. Optional Enhancements

- Add scan logs (audit)
- Add scanner device tracking
- Add rate limiting on check-in endpoint

---

## 12. Constraints / Decisions

- No encryption, only signing (HMAC)
- No dependency on auth/session
- Stateless QR (except DB validation)
- Validation always server-side

---

# FINAL SYSTEM SUMMARY

- PDF Module → handles **generation & distribution**
- QR Module → handles **security & validation**
- TicketService → orchestrates flow (payment → queue → email)

Separation of concerns:

- File access = public & simple
- Security = centralized in QR validation

```

```
