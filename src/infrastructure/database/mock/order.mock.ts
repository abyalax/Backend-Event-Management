import type { Order } from "~/modules/orders/entities/order.entity";
import { OrderStatus } from "~/common/constants/order-status.enum";

import { faker } from '@faker-js/faker';
import { User } from "~/modules/users/entities/user.entity";
import { Ticket } from "~/modules/tickets/entities/ticket.entity";
import { OrderItem } from "~/modules/orders/entities/order-item.entity";
import { Payment } from "~/modules/payments/entities/payment.entity";
import { Transaction } from "~/modules/payments/entities/transaction.entity";
import { GeneratedEventTicket } from "~/modules/tickets/entities/generated-event-ticket.entity";
import { Event } from "~/modules/events/entities/event.entity";
import { PaymentMethod, PaymentStatus } from "~/modules/payments/payment.enum";

export const generateOrderSeeder = (
  users: User[], 
  events: Event[], 
  tickets: Partial<Ticket>[]
) => {
  const orders: Partial<Order>[] = [];
  const orderItems: Partial<OrderItem>[] = [];
  const payments: Partial<Payment>[] = [];
  const transactions: Partial<Transaction>[] = [];
  const generatedTickets: Partial<GeneratedEventTicket>[] = [];

  users.forEach((user) => {
    // Simulasi: Tidak semua user beli, atau ada yang beli berkali-kali
    const numberOfOrders = faker.number.int({ min: 0, max: 2 });

    for (let i = 0; i < numberOfOrders; i++) {
      const orderId = faker.string.uuid(); // ID ini akan jadi externalId
      
      const randomEvent = faker.helpers.arrayElement(events);
      const availableTickets = tickets.filter(t => t.eventId === randomEvent.id);
      
      if (availableTickets.length === 0) continue;

      const selectedTickets = faker.helpers.arrayElements(
        availableTickets, 
        faker.number.int({ min: 1, max: Math.min(availableTickets.length, 2) })
      );

      let totalOrderAmount = 0;

      selectedTickets.forEach((ticket) => {
        const orderItemId = faker.string.uuid();
        const quantity = faker.number.int({ min: 1, max: 3 });
        const subtotal = Number(ticket.price) * quantity;
        totalOrderAmount += subtotal;

        // 1. Buat OrderItem
        orderItems.push({
          id: orderItemId,
          orderId: orderId,
          ticketId: ticket.id,
          quantity: quantity,
          price: Number(ticket.price),
          subtotal: subtotal,
        });

        // 2. Generate E-Ticket per Quantity
        // Jika beli 2 tiket, maka dapet 2 QR Code berbeda
        for (let q = 0; q < quantity; q++) {
          generatedTickets.push({
            id: faker.string.uuid(),
            orderItemId: orderItemId,
            ticketId: ticket.id,
            qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?data=${faker.string.uuid()}`,
            pdfUrl: `https://storage.com/tickets/generated/${faker.string.uuid()}.pdf`,
            isUsed: false,
            issuedAt: new Date(),
          });
        }
      });

      // 3. Buat Order (Main Record)
      orders.push({
        id: orderId,
        userId: user.id,
        totalAmount: totalOrderAmount,
        status: OrderStatus.PAID,
        createdAt: new Date().toISOString(),
      });

      // 4. Buat Payment (Relasi Order ke Gateway)
      payments.push({
        id: faker.string.uuid(),
        orderId: orderId,
        externalId: orderId, // Menggunakan Order ID sesuai request
        amount: totalOrderAmount,
        status: 'COMPLETED',
        paidAt: new Date(),
      });

      // 5. Buat Transaction (Detail log dari Gateway)
      transactions.push({
        id: faker.string.uuid(),
        externalId: orderId, // Sinkron dengan Payment & Order
        xenditId: `ot_${faker.string.alphanumeric(12)}`,
        paymentMethod: faker.helpers.arrayElement([PaymentMethod.INVOICE, PaymentMethod.QRIS, PaymentMethod.EWALLET, PaymentMethod.INVOICE]),
        status: PaymentStatus.PAID,
        amount: totalOrderAmount,
        currency: 'IDR',
        payerEmail: user.email,
        paidAt: new Date(),
        xenditResponse: { status: "SUCCEEDED", channel: "ID_DANA" }
      });
    }
  });

  return { orders, orderItems, payments, transactions, generatedTickets };
};