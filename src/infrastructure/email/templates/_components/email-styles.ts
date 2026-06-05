export const styles = {
  heading: {
    color: '#152235',
    fontSize: '24px',
    lineHeight: '32px',
    fontWeight: 700,
    margin: '0 0 16px',
  },
  subheading: {
    color: '#152235',
    fontSize: '18px',
    lineHeight: '26px',
    fontWeight: 700,
    margin: '24px 0 12px',
  },
  text: {
    color: '#243447',
    fontSize: '14px',
    lineHeight: '22px',
    margin: '0 0 12px',
  },
  muted: {
    color: '#65758b',
    fontSize: '13px',
    lineHeight: '20px',
    margin: '0 0 10px',
  },
  panel: {
    backgroundColor: '#f7fafc',
    border: '1px solid #dbe3ea',
    borderRadius: '8px',
    padding: '16px',
    margin: '18px 0',
  },
  button: {
    backgroundColor: '#1769aa',
    borderRadius: '6px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: 700,
    lineHeight: '20px',
    padding: '12px 18px',
    textDecoration: 'none',
  },
};

export const formatDate = (date?: Date | string | null): string => {
  if (!date) return 'TBD';

  return new Date(date).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const formatMoney = (amount: number | string, currency: string = 'IDR'): string => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return `${amount} ${currency}`;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(numericAmount);
};
