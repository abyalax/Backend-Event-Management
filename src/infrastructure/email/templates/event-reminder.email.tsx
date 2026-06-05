import { Heading, Section, Text } from 'react-email';
import { EmailLayout } from './_components/email-layout';
import { formatDate, formatMoney, styles } from './_components/email-styles';

export interface EventReminderEmailProps {
  eventTitle: string;
  eventDate?: Date | string | null;
  eventLocation?: string | null;
  eventDescription?: string | null;
  message: string;
  order?: {
    id: string;
    ticketCount: number;
    totalAmount: number | string;
  } | null;
}

export const PreviewProps: EventReminderEmailProps = {
  eventTitle: 'Tech Summit 2026',
  eventDate: '2026-07-12T09:00:00.000Z',
  eventLocation: 'Jakarta Convention Center',
  eventDescription: 'A full day conference for product and engineering teams.',
  message: 'Your event is starting in 1 hour.',
  order: {
    id: 'order-uuid',
    ticketCount: 2,
    totalAmount: 500000,
  },
};

export default function EventReminderEmail({
  eventTitle = PreviewProps.eventTitle,
  eventDate = PreviewProps.eventDate,
  eventLocation = PreviewProps.eventLocation,
  eventDescription = PreviewProps.eventDescription,
  message = PreviewProps.message,
  order = PreviewProps.order,
}: Partial<EventReminderEmailProps> = PreviewProps) {
  return (
    <EmailLayout preview={`Reminder: ${eventTitle}`}>
      <Heading style={styles.heading}>Event Reminder</Heading>
      <Text style={styles.text}>{message}</Text>
      <Section style={styles.panel}>
        <Heading as="h2" style={styles.subheading}>
          {eventTitle}
        </Heading>
        <Text style={styles.text}>
          <strong>Date:</strong> {formatDate(eventDate)}
        </Text>
        <Text style={styles.text}>
          <strong>Location:</strong> {eventLocation || 'TBD'}
        </Text>
        {eventDescription ? (
          <Text style={styles.text}>
            <strong>Description:</strong> {eventDescription}
          </Text>
        ) : null}
      </Section>
      {order ? (
        <Section style={styles.panel}>
          <Heading as="h3" style={styles.subheading}>
            Order Details
          </Heading>
          <Text style={styles.text}>
            <strong>Order ID:</strong> {order.id}
          </Text>
          <Text style={styles.text}>
            <strong>Ticket Quantity:</strong> {order.ticketCount}
          </Text>
          <Text style={styles.text}>
            <strong>Total Amount:</strong> {formatMoney(order.totalAmount)}
          </Text>
        </Section>
      ) : null}
      <Text style={styles.text}>Do not forget to bring your ticket and arrive on time.</Text>
    </EmailLayout>
  );
}
