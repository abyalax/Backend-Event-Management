# User Ticket Purchase End-to-End Flow

Dokumen ini menjelaskan urutan endpoint untuk flow pembelian tiket user dari discovery event sampai user bisa melihat order dan ticket yang sudah dibeli untuk event tertentu.

## Prasyarat

- User sudah login dan punya `access_token` di cookie signed.
- JWT middleware sudah mengisi `req.user`.
- Mode payment berjalan dengan `PAYMENT_PROVIDER=mock` untuk testing flow end-to-end tanpa Xendit.

## Dependency Flow

1. `GET /events/public`
2. `GET /events/public/:id`
3. `GET /tickets?page=...&limit=...`
4. `POST /orders/buy-ticket`
5. `GET /orders/user/my-orders`
6. `GET /orders/:id`
7. `GET /orders/:id/status`
8. `GET /orders/:id/tickets`

## 1. Browse Public Events

Endpoint:

```http
GET /events/public
```

Tujuan:

- User mencari event yang ingin dibeli tiketnya.
- Ambil `eventId` dari response.

Contoh response penting:

```json
{
  "data": {
    "data": [
      {
        "id": "event-uuid",
        "title": "Tech Summit 2026"
      }
    ]
  }
}
```

## 2. Lihat Detail Event

Endpoint:

```http
GET /events/public/:id
```

Contoh:

```http
GET /events/public/event-uuid
```

Tujuan:

- Pastikan event yang dipilih benar.
- User bisa lihat informasi event sebelum membeli.

## 3. Ambil Ticket Yang Tersedia Untuk Event

Endpoint:

```http
GET /tickets?page=1&limit=20
```

Kalau ingin filter manual, gunakan data event dari step sebelumnya dan cocokkan `eventId` dari ticket.

Tujuan:

- Cari `ticketId` yang memang milik event tersebut.
- Validasi harga dan quota.

Contoh response penting:

```json
{
  "data": {
    "data": [
      {
        "id": "ticket-uuid",
        "eventId": "event-uuid",
        "name": "VIP Ticket",
        "price": 250000,
        "quota": 100,
        "sold": 25
      }
    ]
  }
}
```

## 4. Buat Order Pembelian Ticket

Endpoint:

```http
POST /orders/buy-ticket
```

Headers:

```http
Content-Type: application/json
Cookie: access_token=...
```

Payload:

```json
{
  "eventId": "event-uuid",
  "ticketId": "ticket-uuid",
  "quantity": 2,
  "description": "Buy 2 VIP tickets for Tech Summit 2026",
  "successRedirectUrl": "http://localhost:3000/payment/success",
  "failureRedirectUrl": "http://localhost:3000/payment/failure"
}
```

Yang dipakai dari JWT:

- `req.user.id` untuk `userId`
- `req.user.email` untuk `payerEmail`

Validasi yang terjadi:

- `eventId` harus ada jika flow ingin spesifik ke event.
- `ticketId` harus milik `eventId` yang dikirim.
- `quantity` minimal 1.
- quota ticket harus cukup.

Hasil:

- Order dibuat dengan status awal `PENDING`.
- Payment mock akan membuat transaction lokal.
- Jika `PAYMENT_PROVIDER=mock`, state payment akan langsung ready sehingga order bisa lanjut ke status siap lihat.

Contoh response penting:

```json
{
  "id": "order-uuid",
  "userId": "user-uuid",
  "totalAmount": 500000,
  "status": "PAID",
  "items": [
    {
      "ticketId": "ticket-uuid",
      "ticketName": "VIP Ticket",
      "quantity": 2,
      "price": 250000,
      "subtotal": 500000
    }
  ],
  "payment": {
    "externalId": "order-uuid",
    "status": "SETTLED",
    "paymentUrl": "mock://payments/invoice/order-uuid"
  }
}
```

## 5. Lihat Semua Order User

Endpoint:

```http
GET /orders/user/my-orders
```

Headers:

```http
Cookie: access_token=...
```

Tujuan:

- User melihat semua order miliknya.
- Dari sini user bisa lihat order mana yang terkait event dan ticket yang dibeli.

Contoh response penting:

```json
[
  {
    "id": "order-uuid",
    "status": "PAID",
    "items": [
      {
        "ticketId": "ticket-uuid",
        "ticketName": "VIP Ticket",
        "quantity": 2
      }
    ]
  }
]
```

## 6. Lihat Detail Order

Endpoint:

```http
GET /orders/:id
```

Contoh:

```http
GET /orders/order-uuid
```

Tujuan:

- User melihat detail order yang spesifik.
- Data item order menunjukkan ticket apa yang dibeli.

## 7. Lihat Status Order Dan Payment

Endpoint:

```http
GET /orders/:id/status
```

Contoh response:

```json
{
  "orderId": "order-uuid",
  "status": "PAID",
  "paymentStatus": "SETTLED",
  "paymentUrl": "mock://payments/invoice/order-uuid",
  "expiredAt": "2026-04-27T12:45:00.000Z"
}
```

Tujuan:

- User memastikan order sudah dibayar.
- Cocok untuk polling setelah submit order.

## 8. Lihat Ticket Yang Sudah Diterbitkan

Endpoint:

```http
GET /orders/:id/tickets
```

Contoh:

```http
GET /orders/order-uuid/tickets
```

Tujuan:

- User melihat ticket yang sudah digenerate untuk order tersebut.
- Ticket ini sudah terkait ke order item dan ticket event yang dibeli.

Contoh response penting:

```json
[
  {
    "id": "generated-ticket-uuid",
    "orderItemId": "order-item-uuid",
    "ticketId": "ticket-uuid",
    "qrCodeUrl": "/orders/order-uuid/tickets/generated-ticket-uuid/qr",
    "pdfUrl": "/orders/order-uuid/tickets/generated-ticket-uuid/pdf",
    "isUsed": false
  }
]
```

## Hasil Akhir Untuk User

Setelah step 5 sampai 8, user bisa melihat:

- Order apa yang sudah dibuat
- Ticket apa yang dibeli
- Ticket itu milik event apa
- Payment status order
- Generated ticket QR/PDF jika order sudah paid

## Catatan

- Kalau payment provider masih `mock`, order akan lebih cepat sampai ke state siap lihat.
- Kalau nanti pindah ke Xendit, step webhook/payment callback perlu ikut dijalankan sebelum `GET /orders/:id/tickets` bisa berhasil.
