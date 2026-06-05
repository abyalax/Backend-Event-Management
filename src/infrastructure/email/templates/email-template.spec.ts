import { renderEmailTemplate } from './index';

describe('renderEmailTemplate', () => {
  it('renders all internal email templates with html and text output', async () => {
    const renderedEmails = await Promise.all([
      renderEmailTemplate('event-created', {
        eventId: 'event-1',
        eventTitle: 'Created Event',
      }),
      renderEmailTemplate('event-reminder', {
        eventTitle: 'Reminder Event',
        eventDate: new Date('2026-07-12T09:00:00.000Z'),
        eventLocation: 'Reminder Hall',
        eventDescription: 'Bring your ticket.',
        message: 'Your event is starting soon.',
        order: {
          id: 'order-1',
          ticketCount: 2,
          totalAmount: 500000,
        },
      }),
      renderEmailTemplate('order-tickets-ready', {
        orderId: 'order-1',
        tickets: [{ id: 'generated-ticket-1', pdfUrl: 'https://example.com/ticket.pdf' }],
      }),
      renderEmailTemplate('payment-confirmed', {
        transactionId: 'transaction-1',
        externalId: 'order-1',
        amount: 500000,
        currency: 'IDR',
        paymentMethod: 'INVOICE',
        paidAt: new Date('2026-07-12T09:30:00.000Z'),
      }),
      renderEmailTemplate('payment-expired', {
        transactionId: 'transaction-1',
        externalId: 'order-1',
        amount: 500000,
        currency: 'IDR',
        paymentMethod: 'INVOICE',
        expiresAt: new Date('2026-07-12T09:30:00.000Z'),
      }),
      renderEmailTemplate('ticket-ready', {
        userName: 'Jane Doe',
        eventTitle: 'Ticket Event',
        eventDate: new Date('2026-07-12T09:00:00.000Z'),
        eventLocation: 'Ticket Hall',
        ticketId: 'generated-ticket-1',
        pdfUrl: 'https://example.com/ticket.pdf',
      }),
    ]);

    for (const renderedEmail of renderedEmails) {
      expect(renderedEmail.html).toContain('<html');
      expect(renderedEmail.text.length).toBeGreaterThan(0);
    }
  });

  it('escapes template props in rendered html', () => {
    const renderedEmail = renderEmailTemplate('event-created', {
      eventId: 'event-1',
      eventTitle: '<script>alert("xss")</script>',
    });

    expect(renderedEmail.html).not.toContain('<script>alert');
    expect(renderedEmail.html).toContain('&lt;script&gt;');
  });
});
