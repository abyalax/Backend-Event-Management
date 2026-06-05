import { Heading, Section, Text } from 'react-email';
import { EmailLayout } from './_components/email-layout';
import { formatDate, formatMoney, styles } from './_components/email-styles';

export interface PaymentExpiredEmailProps {
  transactionId: string;
  externalId: string;
  amount: number | string;
  currency: string;
  paymentMethod: string;
  expiresAt?: Date | string | null;
}

export const PreviewProps: PaymentExpiredEmailProps = {
  transactionId: 'transaction-uuid',
  externalId: 'order-uuid',
  amount: 500000,
  currency: 'IDR',
  paymentMethod: 'INVOICE',
  expiresAt: '2026-07-12T09:30:00.000Z',
};

export default function PaymentExpiredEmail({
  transactionId = PreviewProps.transactionId,
  externalId = PreviewProps.externalId,
  amount = PreviewProps.amount,
  currency = PreviewProps.currency,
  paymentMethod = PreviewProps.paymentMethod,
  expiresAt = PreviewProps.expiresAt,
}: Partial<PaymentExpiredEmailProps> = PreviewProps) {
  return (
    <EmailLayout preview={`Payment expired for ${externalId}`}>
      <Heading style={styles.heading}>Payment Expired</Heading>
      <Text style={styles.text}>Your payment has expired.</Text>
      <Section style={styles.panel}>
        <Text style={styles.text}>
          <strong>Transaction ID:</strong> {transactionId}
        </Text>
        <Text style={styles.text}>
          <strong>External ID:</strong> {externalId}
        </Text>
        <Text style={styles.text}>
          <strong>Amount:</strong> {formatMoney(amount, currency)}
        </Text>
        <Text style={styles.text}>
          <strong>Payment Method:</strong> {paymentMethod}
        </Text>
        <Text style={styles.text}>
          <strong>Expires At:</strong> {formatDate(expiresAt)}
        </Text>
      </Section>
    </EmailLayout>
  );
}
