## Project Structure & Pattern

> Resolution note: all `Need to Improve` items in this document are covered by the current implementation work. Order ticket PDF/upload logic is delegated to `PdfService`/`StorageService`, event/media persistence uses direct TypeORM repositories through services, auth uses a single JWT guard, quota reservation uses Redis locks plus atomic DB updates, and runtime configuration uses env-backed config.

### Good:

1. Layering sudah konsisten: Layering controller → service → repository
2. Folder /common, /infrastructure, /modules terpisah dengan baik

### Need to Improve:

1. Class `OrderService` terlalu besar `src/modules/orders/order.service.ts`
   - Injected dependency di constructor class terlalu banyak 12+
   - Ada `PdfService` dan `StorageService` di-inject, tapi function `generateTicketPdf()` dan `storeTicketPdf()` tetap ada di class ini
   - Satu service harusnya satu tanggung jawab, logic PDF/upload seharusnya di `PdfService` `StorageService`
2. Business logic di repository layer `src/modules/events/event.repository.ts:17`
   - function `EventRepository.create()` melakukan cek dan hapus existing banner, hal tersebut termasuk business rule, bukan persistence concern. Pindahin hal ini ke `EventService`
3. Repository inkonsisten
   - Sebagian modul punya custom repository class (`EventRepository`, `MediaRepository`)
   - Sebagian lain inject `Repository<T>` TypeORM langsung ke service
   - Pilih satu pola, konsisten di seluruh codebase

## Framework Best Practice

### Good:

1. Custom guards, pipes, decorators, providers sesuai dengan idiom NestJS bener
2. `ValidationPipe` global dengan `whitelist: true` dan `forbidNonWhitelisted: true`

### Need to Improve:

1. CORS origin hardcoded `src/main.ts:18`
2. Rate limit config hardcoded `src/app.module.ts`
   - ttl: 60000, limit: 20 ditulis langsung tanpa dimasukkan kedalam env / config
   - Env var `RATE_LIMIT_WINDOW_MS` dan `RATE_LIMIT_MAX_REQUESTS` ada di `.env.example` tapi sepertinya nggak dipakai
3. `AuthGuard` dan `JwtGuard` overlap, keduanya verifikasi JWT dari cookie, ada route yang pakai keduanya sekaligus, token di-verify dua kali

## Database Design

### Good:

1. Soft delete konsisten
2. Index strategis di FK column dan kolom filter
3. Composite index `(startDate, endDate)` di Events
4. Conditional unique index untuk satu banner per event
5. CASCADE rules tepat
6. JSONB untuk `xenditResponse` dan `metadata`

### Need to Improve:

1. `User.email` nggak ada constraint unique di class entity `src/modules/users/entities/user.entity.ts`
   - Constraint ada di migration, tapi nggak ada di entity decorator
   - Harusnya ada constraint di class entity supaya eksplisit
2. `Ticket.isUsed` redundant `src/modules/tickets/entities/ticket.entity.ts`
   - Actual check-in tracking ada di `GeneratedEventTicket.isUsed` (per tiket individu)
   - `Ticket.isUsed` nggak pernah di-update saat check-in, field zombie

## Query Best Practice

### Good:

1. QueryBuilder di `DashboardService` parameterized aman dari SQL injection
2. Aggregate query dengan `JOIN` sudah tepat

### Need to Improve:

1 . N+1 di `getUserOrders()` `src/modules/orders/order.service.ts:242-247` → Kalau halaman berisi 20 order, ini akan melakukan 21 query ke DB (1 untuk paginate + 20 untuk payment). Solusinya: load semua transaction sekaligus dengan IN query, atau join langsung ke paginate config.

```typescript
// order.service.ts:239-247
const paginatedOrders = await paginate(mappedQuery, this.orderRepository, ORDER_PAGINATION_CONFIG);

const ordersWithPayment = await Promise.all(
  paginatedOrders.data.map(async (order) => {
    const payment = await this.getPaymentByOrderId(order.id); // ← 1 query per order
    return this.toOrderResponse(order, payment);
  }),
);
```

2. N+1 di `releaseTicketQuotas()` `src/modules/orders/order.service.ts:323-332` → Solusinya: manfaatkan data query relasi pada line 316-319. untuk N+1 save gunakan batch action, mekanismenya, siapkan variable array, lalu di proses looping melakukan push ke array dan diluar looping baru dilakukan batch proses dari array tersebut

```typescript
for (const item of order.orderItems) {
  if (!item.ticket) continue;

  const ticket = await this.ticketRepository.findOne({ where: { id: item.ticketId } }); ← 1 query per looping N+1 fetch
  if (!ticket) continue;

  const currentSold = Number(ticket.sold ?? 0);
  ticket.sold = Math.max(0, currentSold - Number(item.quantity));
  await this.ticketRepository.save(ticket); ← 1 query save per looping N+1 save
}
```

3. Save berulang dalam loop di `generateTicketsForOrder()` → Tiap tiket di-save dua kali. Seharusnya generate QR dan PDF dulu, baru save sekali dengan data lengkap. Ini terutama masalah ketika ada banyak tiket dalam satu order. Function ini juga terdapat N+1 issue

```typescript
// order.service.ts:362-381
const saved = await this.generatedTicketRepository.save(ticket); // save 1: status 'pending'
saved.qrCodeUrl = qrCodePayload;
saved.pdfUrl = pdfUrl;
const persisted = await this.generatedTicketRepository.save(saved); // save 2: update url
```

4. `findOrderById()` selalu load full deep relations. → Method ini dipanggil dari `cancelOrder()`, `getOrderStatus()`, `handleSuccessfulPayment()`, `handleExpiredPayment()`, semua context berbeda dengan kebutuhan relasi berbeda. Load semuanya setiap kali adalah pemborosan. Pertimbangkan lazy loading atau overload parameter untuk select relations yang dibutuhkan.

```typescript
// order.service.ts:257-260
const order = await this.orderRepository.findOne({
  where: { id: orderId },
  relations: ['orderItems', 'orderItems.ticket', 'orderItems.ticket.event', 'orderItems.generatedTickets'],
});
```

## Performance

### Need to Improve:

1. Triple eager loading di auth path
   - `User.roles` → `eager, Role.rolePermissions` → eager, `RolePermission.permission` → eager
   - Setiap `findByEmail()` saat auth load 4 level relasi sekaligus
   - Untuk user dengan banyak role, ini bisa jadi query besar yang jalan di setiap request
2. `clearByPattern()` pakai Redis KEYS `src/infrastructure/cache/cache.service.ts:128` → Solusi Ganti ke SCAN dengan cursor

```typescript
const keys = await client.keys(pattern); // blocking freeze Redis sampai selesai
```

3. Busy-wait polling di `waitForCache()` `cache.service.ts:103-115`
   - Poll Redis tiap 100ms, max 5000ms = hingga 50 round trip hanya untuk nunggu lock
   - Pertimbangkan Redis Pub/Sub untuk notifikasi lock release

## Security

### Good:

1. bcrypt salt 10
2. JWT di HTTP-only signed cookie
3. class-validator dengan whitelist mode
4. Rate limiting global

### Need to Improve:

1. `AuthGuard` sembunyikan real error `src/common/guards/auth.guard.ts:28-31` → Token invalid, signature mismatch, malformed semua dilempar sebagai TOKEN_EXPIRED. JwtGuard sudah handle error types dengan benar, AuthGuard tidak.

```typescript
} catch (_e) {
  console.log('AuthGuard: ', _e.message) // leak error ke stdout
  throw new UnauthorizedException(EMessage.TOKEN_EXPIRED) // selalu expired
}
```

2. Password nggak ada minimum requirement `src/modules/auth/dto/sign-up.dto.ts`
   - `@IsString()` saja, tanpa `@MinLength(8)` atau complexity check
   - User bisa register dengan password "a"

3. `refreshToken` disimpan plaintext `src/modules/users/entities/user.entity.ts`
   - Kalau DB compromise, semua refresh token langsung bisa dipakai
   - Hash sebelum disimpan

## Concurrency & Parallelism

### Good:

1. Promise.all untuk parallel JWT signing
2. Promise.race untuk timeout di storage retry
3. Promise.allSettled untuk health checks
4. Cache stampede prevention dengan distributed lock, ini yang paling bagus di codebase ini

### Need to Improve:

1. Race condition overselling tiket ← ini paling kritis `order.service.ts:119-121`
   - Skenario: tiket sisa 1, User A dan User B request bersamaan → keduanya lolos validasi → keduanya bayar → overselling.
   - `TicketLockService` sudah ada di `src/infrastructure/cache/ticket-lock.service.ts` tapi tidak dipakai di `createOrder()`. Ini tinggal diintegrasikan.

```typescript
const remaining = Number(ticket.quota) - Number(ticket.sold ?? 0)
if (remaining < quantity) throw new BadRequestException(...)
// quota TIDAK dikurangi di sini hanya saat payment selesai
```

2. Quota update non-atomic `order.service.ts:401-417`
   - Kalau ada 3 tiket dan save ke-2 gagal, quota ke-1 sudah berubah tapi ke-2 dan ke-3 belum. Non-atomic, partial update. Bungkus dalam transaction dan gunakan incremental update `(UPDATE ... SET sold = sold + $1)`.

```typescript
for (const orderItem of order.orderItems ?? []) {
  ticket.sold = Number(ticket.sold ?? 0) + Number(orderItem.quantity);
  await this.ticketRepository.save(ticket); // N saves individual
}
```

## Clean Code

### Good:

1. Penamaan umumnya deskriptif
2. Early return dipakai di banyak tempat
3. Error messages di service informatif

### Need to Improve:

1. console.\* tersebar, nggak konsisten dengan Pino setup
2. `TicketService.getIds()` load semua field `src/modules/tickets/ticket.service.ts:22` → Harusnya select: { id: true }

```typescript
const rows = await this.ticketRepository.find({ select: {} }); // load semua kolom
return rows.map((r) => Number(r.id)); // hanya pakai id
```

3. Magic string bucket name `order.service.ts:606`

```
bucket: 'tickets-public' // env var STORAGE_BUCKET_TICKETS_PUBLIC sudah ada
```

4. Hidden side effect di `toOrderResponse()` `order.service.ts:537` → Method yang kelihatannya pure transformation, ternyata bisa trigger DB query. Selalu pass payment eksplisit atau rename method.

```typescript
const transaction = payment ?? (await this.getPaymentByOrderId(order.id)); // query tersembunyi
```

5. HTML email template inline `order.service.ts:642-651`
   - Template HTML 10+ baris di-generate langsung di service pakai string interpolation
   - Susah di-maintain, nggak bisa di-preview pindahin ke file template terpisah
