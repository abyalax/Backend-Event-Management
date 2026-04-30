import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { faker } from '@faker-js/faker';
import { User } from '~/modules/users/entity/user.entity';
import { Event } from '~/modules/events/entity/event.entity';
import { Order } from '~/modules/orders/entity/order.entity';
import { OrderItem } from '~/modules/orders/entity/order-item.entity';
import { Ticket } from '~/modules/tickets/entities/ticket.entity';
import { Payment } from '~/modules/payments/entities/payment.entity';
import { Transaction } from '~/modules/payments/entities/transaction.entity';
import { GeneratedEventTicket } from '~/modules/tickets/entities/generated-event-ticket.entity';
import { OrderStatus } from '~/common/constants/order-status.enum';
import { PaymentMethod, PaymentStatus } from '~/modules/payments/payment.enum';

export default class OrderSeeder implements Seeder {
  track = true;

  public async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const eventRepository = dataSource.getRepository(Event);
    const ticketRepository = dataSource.getRepository(Ticket);
    const orderRepository = dataSource.getRepository(Order);
    const orderItemRepository = dataSource.getRepository(OrderItem);
    const paymentRepository = dataSource.getRepository(Payment);
    const transactionRepository = dataSource.getRepository(Transaction);
    const generatedTicketRepository = dataSource.getRepository(GeneratedEventTicket);

    // 1. Ambil data yang sudah ada dari seeder sebelumnya
    const allUsers = await userRepository.find();
    const allEvents = await eventRepository.find({ relations: ['tickets'] });
    const allTickets = await ticketRepository.find();

    if (allUsers.length === 0 || allEvents.length === 0) {
      console.warn('⚠️ Skip OrderSeeder: User atau Event tidak ditemukan.');
      return;
    }

    const orders: Order[] = [];
    const orderItems: OrderItem[] = [];
    const payments: Payment[] = [];
    const transactions: Transaction[] = [];
    const generatedTickets: GeneratedEventTicket[] = [];

    // 2. Generate Data Logic
    for (const user of allUsers) {
      // Tidak semua user membeli tiket (simulasi 70% aktif)
      if (faker.number.float({ min: 0, max: 1 }) > 0.7) continue;

      const orderId = faker.string.uuid();
      const randomEvent = faker.helpers.arrayElement(allEvents);
      const availableTickets = allTickets.filter((t) => t.eventId === randomEvent.id);

      if (availableTickets.length === 0) continue;

      // Pilih 1-2 jenis tiket per order
      const selectedTickets = faker.helpers.arrayElements(availableTickets, faker.number.int({ min: 1, max: Math.min(availableTickets.length, 2) }));

      let totalOrderAmount = 0;

      for (const ticket of selectedTickets) {
        const orderItemId = faker.string.uuid();
        const quantity = faker.number.int({ min: 1, max: 3 });
        const subtotal = Number(ticket.price) * quantity;
        totalOrderAmount += subtotal;

        // Create Order Item
        orderItems.push(
          orderItemRepository.create({
            id: orderItemId,
            orderId: orderId,
            ticketId: ticket.id,
            quantity,
            price: Number(ticket.price),
            subtotal,
          }),
        );

        // Create E-Tickets based on quantity
        for (let q = 0; q < quantity; q++) {
          generatedTickets.push(
            generatedTicketRepository.create({
              id: faker.string.uuid(),
              orderItemId,
              ticketId: ticket.id,
              qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?data=${faker.string.uuid()}`,
              pdfUrl: `https://storage.com/tickets/generated/${faker.string.uuid()}.pdf`,
              isUsed: false,
              issuedAt: new Date(),
            }),
          );
        }
      }

      // Create Order
      orders.push(
        orderRepository.create({
          id: orderId,
          userId: user.id,
          totalAmount: totalOrderAmount,
          status: OrderStatus.PAID,
        }),
      );

      // Create Payment
      payments.push(
        paymentRepository.create({
          id: faker.string.uuid(),
          orderId: orderId,
          externalId: orderId, // Match Order ID
          amount: totalOrderAmount,
          status: 'COMPLETED',
          paidAt: new Date(),
        }),
      );

      // Create Transaction log
      transactions.push(
        transactionRepository.create({
          id: faker.string.uuid(),
          externalId: orderId,
          xenditId: `ot_${faker.string.alphanumeric(12)}`,
          paymentMethod: faker.helpers.arrayElement([
            PaymentMethod.INVOICE,
            PaymentMethod.QRIS,
            PaymentMethod.INVOICE,
            PaymentMethod.EWALLET,
            PaymentMethod.VIRTUAL_ACCOUNT,
          ]),
          status: PaymentStatus.PAID,
          amount: totalOrderAmount,
          currency: 'IDR',
          payerEmail: user.email,
          paidAt: new Date(),
        }),
      );
    }

    // 3. Database Persistence (Gunakan chunking agar aman)
    console.log(`🚀 Seeding ${orders.length} orders...`);

    await orderRepository.save(orders, { chunk: 50 });
    await orderItemRepository.save(orderItems, { chunk: 100 });
    await paymentRepository.save(payments, { chunk: 100 });
    await transactionRepository.save(transactions, { chunk: 100 });
    await generatedTicketRepository.save(generatedTickets, { chunk: 100 });

    console.log('✅ OrderSeeder completed!');
  }
}
