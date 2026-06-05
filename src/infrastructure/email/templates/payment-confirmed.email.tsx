import { Heading, Section, Text } from 'react-email';
import { EmailLayout } from './_components/email-layout';
import { formatDate, formatMoney, styles } from './_components/email-styles';

export interface PaymentConfirmedEmailProps {
  transactionId: string;
  externalId: string;
  amount: number | string;
  currency: string;
  paymentMethod: string;
  paidAt?: Date | string | null;
}

export const PreviewProps: PaymentConfirmedEmailProps = {
  transactionId: 'transaction-uuid',
  externalId: 'order-uuid',
  amount: 500000,
  currency: 'IDR',
  paymentMethod: 'INVOICE',
  paidAt: '2026-07-12T09:30:00.000Z',
};

export default function PaymentConfirmedEmail({
  transactionId = PreviewProps.transactionId,
  externalId = PreviewProps.externalId,
  amount = PreviewProps.amount,
  currency = PreviewProps.currency,
  paymentMethod = PreviewProps.paymentMethod,
  paidAt = PreviewProps.paidAt,
}: Partial<PaymentConfirmedEmailProps> = PreviewProps) {
  return (
    <EmailLayout preview={`Payment confirmed for ${externalId}`}>
      <Heading style={styles.heading}>Payment Confirmed</Heading>
      <Text style={styles.text}>Your payment has been confirmed.</Text>
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
          <strong>Paid At:</strong> {formatDate(paidAt)}
        </Text>
      </Section>
    </EmailLayout>
  );
}
