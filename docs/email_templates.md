# Email Templates

Email internal backend menggunakan React Email templates di `src/infrastructure/email/templates`.

## Preview

Jalankan preview server lokal:

```bash
pnpm email:dev
```

Preview berjalan di port `3001` dan membaca template dari `src/infrastructure/email/templates`. File reusable disimpan di `_components/` agar tidak muncul sebagai template preview.

Untuk export HTML statis:

```bash
pnpm email:export
```

Output export masuk ke `.react-email-export/` dan tidak perlu di-commit.

## Membuat Template Baru

1. Buat file `src/infrastructure/email/templates/<name>.email.tsx`.
2. Export interface props dan `PreviewProps`.
3. Render dengan `EmailLayout` dan komponen React Email.
4. Daftarkan nama template dan props di `src/infrastructure/email/templates/index.ts`.
5. Kirim dari service menggunakan `EmailService.sendTemplateEmail()`.

Contoh:

```ts
await this.emailService.sendTemplateEmail({
  to: user.email,
  subject: 'Payment Confirmed',
  template: 'payment-confirmed',
  props: {
    transactionId: transaction.id,
    externalId: transaction.externalId,
    amount: transaction.amount,
    currency: transaction.currency,
    paymentMethod: transaction.paymentMethod,
    paidAt: transaction.paidAt,
  },
});
```

`sendTemplateEmail()` merender HTML dan plaintext fallback. Gunakan `text` hanya jika caller perlu override plaintext.

## Testing

Tambahkan unit test untuk template baru di `src/infrastructure/email/templates/email-template.spec.ts`. Minimal pastikan HTML berisi field penting, plaintext terbentuk, dan props user-generated tidak muncul sebagai raw HTML.
