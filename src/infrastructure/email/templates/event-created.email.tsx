import { Heading, Text } from 'react-email';
import { EmailLayout } from './_components/email-layout';
import { styles } from './_components/email-styles';

export interface EventCreatedEmailProps {
  eventId: string;
  eventTitle: string;
}

export const PreviewProps: EventCreatedEmailProps = {
  eventId: 'event-uuid',
  eventTitle: 'Tech Summit 2026',
};

export default function EventCreatedEmail({
  eventId = PreviewProps.eventId,
  eventTitle = PreviewProps.eventTitle,
}: Partial<EventCreatedEmailProps> = PreviewProps) {
  return (
    <EmailLayout preview={`Event created: ${eventTitle}`}>
      <Heading style={styles.heading}>Event Created Successfully</Heading>
      <Text style={styles.text}>Dear User,</Text>
      <Text style={styles.text}>
        Your event <strong>{eventTitle}</strong> has been successfully created and will be published soon.
      </Text>
      <Text style={styles.text}>Event ID: {eventId}</Text>
      <Text style={styles.text}>Thank you for using our event management system.</Text>
      <Text style={styles.text}>Best regards, Event Management Team</Text>
    </EmailLayout>
  );
}
