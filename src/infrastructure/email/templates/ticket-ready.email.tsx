import { Button, Heading, Section, Text } from 'react-email';
import { EmailLayout } from './_components/email-layout';
import { formatDate, styles } from './_components/email-styles';

export interface TicketReadyEmailProps {
  userName: string;
  eventTitle: string;
  eventDate: Date | string;
  eventLocation: string;
  ticketId: string;
  pdfUrl: string;
}

export const PreviewProps: TicketReadyEmailProps = {
  userName: 'Jane Doe',
  eventTitle: 'Tech Summit 2026',
  eventDate: '2026-07-12T09:00:00.000Z',
  eventLocation: 'Jakarta Convention Center',
  ticketId: 'generated-ticket-uuid',
  pdfUrl: 'https://example.com/tickets/generated-ticket-uuid.pdf',
};

export default function TicketReadyEmail({
  userName = PreviewProps.userName,
  eventTitle = PreviewProps.eventTitle,
  eventDate = PreviewProps.eventDate,
  eventLocation = PreviewProps.eventLocation,
  ticketId = PreviewProps.ticketId,
  pdfUrl = PreviewProps.pdfUrl,
}: Partial<TicketReadyEmailProps> = PreviewProps) {
  return (
    <EmailLayout preview={`Your ticket for ${eventTitle} is ready`}>
      <Heading style={styles.heading}>Your Ticket is Ready</Heading>
      <Text style={styles.text}>Hello {userName},</Text>
      <Text style={styles.text}>Your ticket has been generated and is ready for download.</Text>
      <Section style={styles.panel}>
        <Heading as="h2" style={styles.subheading}>
          Event Details
        </Heading>
        <Text style={styles.text}>
          <strong>Event:</strong> {eventTitle}
        </Text>
        <Text style={styles.text}>
          <strong>Date:</strong> {formatDate(eventDate)}
        </Text>
        <Text style={styles.text}>
          <strong>Location:</strong> {eventLocation}
        </Text>
        <Text style={styles.text}>
          <strong>Ticket ID:</strong> {ticketId}
        </Text>
      </Section>
      <Button href={pdfUrl} style={styles.button}>
        Download Your Ticket
      </Button>
      <Heading as="h2" style={styles.subheading}>
        Important
      </Heading>
      <Text style={styles.text}>Please bring this ticket, printed or on your mobile device, to the event.</Text>
      <Text style={styles.text}>The QR code in the ticket will be scanned for entry and can only be used once.</Text>
    </EmailLayout>
  );
}
