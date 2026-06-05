import { Heading, Link, Text } from 'react-email';
import { EmailLayout } from './_components/email-layout';
import { styles } from './_components/email-styles';

export interface OrderTicketItem {
  id: string;
  pdfUrl: string;
}

export interface OrderTicketsReadyEmailProps {
  orderId: string;
  tickets: OrderTicketItem[];
}

export const PreviewProps: OrderTicketsReadyEmailProps = {
  orderId: 'order-uuid',
  tickets: [
    { id: 'ticket-1', pdfUrl: 'https://example.com/tickets/ticket-1.pdf' },
    { id: 'ticket-2', pdfUrl: 'https://example.com/tickets/ticket-2.pdf' },
  ],
};

export default function OrderTicketsReadyEmail({
  orderId = PreviewProps.orderId,
  tickets = PreviewProps.tickets,
}: Partial<OrderTicketsReadyEmailProps> = PreviewProps) {
  return (
    <EmailLayout preview={`Your tickets for order ${orderId} are ready`}>
      <Heading style={styles.heading}>Your Tickets Are Ready</Heading>
      <Text style={styles.text}>Thank you for your purchase. Your tickets for order {orderId} are now available.</Text>
      <Heading as="h2" style={styles.subheading}>
        Ticket Details
      </Heading>
      {tickets.map((ticket) => (
        <Text key={ticket.id} style={styles.text}>
          Ticket ID: {ticket.id} - <Link href={ticket.pdfUrl}>Download PDF</Link>
        </Text>
      ))}
      <Text style={styles.text}>Please present these tickets at the event entrance.</Text>
      <Text style={styles.text}>Best regards, Event Management Team</Text>
    </EmailLayout>
  );
}
