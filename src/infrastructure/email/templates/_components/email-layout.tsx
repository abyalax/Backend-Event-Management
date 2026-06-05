import { Body, Container, Head, Hr, Html, Preview, Section, Text } from 'react-email';
import type { PropsWithChildren } from 'react';

const styles = {
  body: {
    margin: 0,
    backgroundColor: '#f4f6f8',
    fontFamily: 'Arial, Helvetica, sans-serif',
    color: '#243447',
  },
  container: {
    width: '100%',
    maxWidth: '620px',
    margin: '0 auto',
    padding: '24px 16px',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #dbe3ea',
    borderRadius: '8px',
    padding: '28px',
  },
  footer: {
    color: '#6b7785',
    fontSize: '12px',
    lineHeight: '18px',
    textAlign: 'center' as const,
  },
};

interface EmailLayoutProps extends PropsWithChildren {
  preview: string;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.card}>{children}</Section>
          <Hr style={{ borderColor: '#dbe3ea', margin: '24px 0 12px' }} />
          <Text style={styles.footer}>This is an automated email from Event Management. Please do not reply to this email.</Text>
        </Container>
      </Body>
    </Html>
  );
}
