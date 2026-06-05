import nodemailer from 'nodemailer';
import { PinoLogger } from 'nestjs-pino';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { EmailService } from './email.service';
import type { EmailConfig } from './email.interface';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

describe('EmailService', () => {
  const sendMail = jest.fn();
  const verify = jest.fn();

  const emailConfig: EmailConfig = {
    host: 'localhost',
    port: 1025,
    secure: false,
    auth: {
      user: 'user',
      pass: 'pass',
    },
    from: 'noreply@example.com',
    fromName: 'Event Management',
  };

  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as PinoLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail, verify });
    sendMail.mockResolvedValue(undefined);
    verify.mockResolvedValue(true);
  });

  it('sends rendered template email through nodemailer', async () => {
    const service = new EmailService(emailConfig, logger);

    await service.sendTemplateEmail({
      to: 'buyer@example.com',
      subject: 'Payment Confirmed',
      template: 'payment-confirmed',
      props: {
        transactionId: 'transaction-1',
        externalId: 'order-1',
        amount: 500000,
        currency: 'IDR',
        paymentMethod: 'INVOICE',
        paidAt: new Date('2026-07-12T09:30:00.000Z'),
      },
      replyTo: 'support@example.com',
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Event Management <noreply@example.com>',
        to: 'buyer@example.com',
        subject: 'Payment Confirmed',
        replyTo: 'support@example.com',
        html: expect.stringContaining('Payment Confirmed'),
        text: expect.stringContaining('PAYMENT CONFIRMED'),
      }),
    );
  });

  it('is injectable with the email config provider token', () => {
    expect(CONFIG_PROVIDER.EMAIL).toBeDefined();
  });
});
