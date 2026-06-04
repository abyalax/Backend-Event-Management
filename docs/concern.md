## Project Structure & Pattern

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

