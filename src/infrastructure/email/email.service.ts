import { Injectable, Inject } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  fromName: string;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string | null;
  replyTo?: string | null;
  cc?: string | string[] | null;
  bcc?: string | string[] | null;
}

@Injectable()
export class EmailService {
  private transporter: Transporter;

  constructor(
    @Inject('EMAIL_CONFIG') private readonly emailConfig: EmailConfig,

    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(EmailService.name);
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    this.transporter = nodemailer.createTransport({
      host: this.emailConfig.host,
      port: this.emailConfig.port,
      secure: this.emailConfig.secure,
      auth: {
        user: this.emailConfig.auth.user,
        pass: this.emailConfig.auth.pass,
      },
    });

    this.logger.info(`Email transporter initialized for ${this.emailConfig.host}:${this.emailConfig.port}`);
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: `${this.emailConfig.fromName} <${this.emailConfig.from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        ...(options.text && { text: options.text }),
        ...(options.replyTo && { replyTo: options.replyTo }),
        ...(options.cc && { cc: options.cc }),
        ...(options.bcc && { bcc: options.bcc }),
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.info(
        {
          to: options.to,
          subject: options.subject,
        },
        'Email sent successfully',
      );
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          to: options.to,
          subject: options.subject,
        },
        'Failed to send email',
      );
      throw error;
    }
  }

  async sendBulkEmail(recipients: string[], subject: string, html: string, text?: string | null): Promise<void> {
    try {
      const mailOptions = {
        from: `${this.emailConfig.fromName} <${this.emailConfig.from}>`,
        to: recipients,
        subject,
        html,
        ...(text && { text }),
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.info(
        {
          recipientCount: recipients.length,
          subject,
        },
        'Bulk email sent successfully',
      );
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          recipientCount: recipients.length,
          subject,
        },
        'Failed to send bulk email',
      );
      throw error;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.info('Email transporter connection verified');
      return true;
    } catch (error) {
      // In development and test, be more lenient with connection failures
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        this.logger.warn(
          { error: error instanceof Error ? error.message : 'Unknown error' },
          `Email transporter connection failed in ${process.env.NODE_ENV} (continuing anyway)`,
        );

        return true; // Allow development/test to continue even if verification fails
      }
      this.logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Email transporter connection failed');
      return false;
    }
  }
}
