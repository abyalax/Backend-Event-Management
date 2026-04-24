import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueErrorHandler } from './queue.error-handler';
import { PinoLogger } from 'nestjs-pino';
import { QUEUE_NAMES, QUEUE_JOB_NAMES } from './queue.constants';
import { RedisService } from '../redis/redis.service';

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  html?: string;
  replyTo?: string;
}

export interface SmsJobData {
  phoneNumber: string;
  message: string;
  templateId?: string;
}

export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class JobHandlerService implements OnModuleInit {
  private readonly eventSubscriptions: Map<string, (data: unknown) => void> = new Map();

  constructor(
    private readonly queueService: QueueService,
    private readonly errorHandler: QueueErrorHandler,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    try {
      this.initializeQueues();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error({ error: errorMessage }, 'Failed to initialize job handlers');
      throw error;
    }
  }

  private initializeQueues() {
    this.queueService.registerQueue(QUEUE_NAMES.EMAIL, [
      {
        name: QUEUE_JOB_NAMES.SEND_EMAIL,
        handler: this.handleEmailJob.bind(this),
        options: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
          timeout: 30000,
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
    ]);

    this.queueService.registerQueue(QUEUE_NAMES.NOTIFICATION, [
      {
        name: QUEUE_JOB_NAMES.SEND_NOTIFICATION,
        handler: this.handleNotificationJob.bind(this),
        options: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          timeout: 20000,
          removeOnComplete: true,
        },
      },
    ]);

    this.queueService.registerQueue(QUEUE_NAMES.CLEANUP, [
      {
        name: QUEUE_JOB_NAMES.CLEANUP_EXPIRED,
        handler: this.handleCleanupExpired.bind(this),
        options: {
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 5000,
          },
          timeout: 60000,
        },
      },
      {
        name: QUEUE_JOB_NAMES.CLEANUP_ORPHANED,
        handler: this.handleCleanupOrphaned.bind(this),
        options: {
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 5000,
          },
          timeout: 60000,
        },
      },
    ]);

    this.logger.info('All job handlers initialized');
  }

  async handleEmailJob(data: EmailJobData) {
    this.logger.debug({ data }, 'Processing email job');

    try {
      // Validate email data
      if (!data.to || !data.subject || !data.body) {
        throw new Error('Missing required email fields: to, subject, body');
      }

      // Validate email format
      if (!this.isValidEmail(data.to)) {
        throw new Error(`Invalid email format: ${data.to}`);
      }

      await this.sendEmail(data);

      await this.publishEvent('email-events', {
        type: 'email-sent',
        to: data.to,
        subject: data.subject,
        timestamp: new Date().toISOString(),
      });

      this.logger.info({ to: data.to }, 'Email sent successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error({ data, error: errorMessage }, 'Email job failed');

      await this.publishEvent('email-events', {
        type: 'email-failed',
        to: data.to,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }

  async handleNotificationJob(data: NotificationJobData) {
    this.logger.debug({ data }, 'Processing notification job');

    try {
      if (!data.userId || !data.type || !data.title || !data.message) {
        throw new Error('Missing required notification fields: userId, type, title, message');
      }

      await this.sendNotification(data);

      await this.publishEvent('notification-events', {
        type: 'notification-sent',
        userId: data.userId,
        notificationType: data.type,
        timestamp: new Date().toISOString(),
      });

      this.logger.info({ userId: data.userId, notificationType: data.type }, 'Notification sent');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error({ data, error: errorMessage }, 'Notification job failed');

      await this.publishEvent('notification-events', {
        type: 'notification-failed',
        userId: data.userId,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }

  async handleCleanupExpired(data: unknown) {
    this.logger.debug({ data }, 'Processing cleanup expired job');

    try {
      await this.cleanupExpiredData();

      await this.publishEvent('cleanup-events', {
        type: 'cleanup-expired-completed',
        timestamp: new Date().toISOString(),
      });

      this.logger.info('Cleanup expired completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error({ error: errorMessage }, 'Cleanup expired job failed');

      await this.publishEvent('cleanup-events', {
        type: 'cleanup-expired-failed',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }

  async handleCleanupOrphaned(data: unknown) {
    this.logger.debug({ data }, 'Processing cleanup orphaned job');

    try {
      await this.cleanupOrphanedData();

      await this.publishEvent('cleanup-events', {
        type: 'cleanup-orphaned-completed',
        timestamp: new Date().toISOString(),
      });

      this.logger.info('Cleanup orphaned completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error({ error: errorMessage }, 'Cleanup orphaned job failed');

      await this.publishEvent('cleanup-events', {
        type: 'cleanup-orphaned-failed',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }

  private async sendEmail(data: EmailJobData): Promise<void> {
    try {
      // TODO: Integrate with your email service (e.g., Nodemailer, SendGrid, etc.)
      // Example:
      // await this.emailService.send({
      //   to: data.to,
      //   subject: data.subject,
      //   html: data.html || data.body,
      //   replyTo: data.replyTo,
      // });

      // Simulate email sending
      await new Promise((resolve) => setTimeout(resolve, 100));

      this.logger.debug({ to: data.to }, 'Email sent via service');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  }

  private async sendNotification(data: NotificationJobData): Promise<void> {
    try {
      // TODO: Integrate with your notification service (e.g., Firebase, Pusher, etc.)
      // Example:
      // await this.notificationService.sendToUser(data.userId, {
      //   title: data.title,
      //   message: data.message,
      //   data: data.data,
      // });

      // Simulate notification sending
      await new Promise((resolve) => setTimeout(resolve, 50));

      this.logger.debug({ userId: data.userId }, 'Notification sent via service');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to send notification: ${errorMessage}`);
    }
  }

  private async cleanupExpiredData(): Promise<void> {
    try {
      // TODO: Implement cleanup logic for expired records
      // Example:
      // await this.db.deleteMany({
      //   expiresAt: { $lt: new Date() }
      // });

      // Simulate cleanup
      await new Promise((resolve) => setTimeout(resolve, 200));

      this.logger.debug('Expired data cleaned up');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to cleanup expired data: ${errorMessage}`);
    }
  }

  private async cleanupOrphanedData(): Promise<void> {
    try {
      // TODO: Implement cleanup logic for orphaned records
      // Example:
      // await this.db.deleteMany({
      //   parentId: null,
      //   createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      // });

      // Simulate cleanup
      await new Promise((resolve) => setTimeout(resolve, 200));

      this.logger.debug('Orphaned data cleaned up');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to cleanup orphaned data: ${errorMessage}`);
    }
  }

  private async publishEvent(channel: string, message: unknown): Promise<void> {
    try {
      await this.redisService.publish(channel, message);

      this.logger.debug({ channel, message }, 'Event published');
    } catch (error) {
      this.logger.warn({ channel, error: error instanceof Error ? error.message : String(error) }, 'Failed to publish event');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Public methods for external usage
  async sendEmailJob(data: EmailJobData, opts?: any) {
    return this.queueService.addJob(QUEUE_NAMES.EMAIL, QUEUE_JOB_NAMES.SEND_EMAIL, data, opts);
  }

  async sendNotificationJob(data: NotificationJobData, opts?: any) {
    return this.queueService.addJob(QUEUE_NAMES.NOTIFICATION, QUEUE_JOB_NAMES.SEND_NOTIFICATION, data, opts);
  }

  async scheduleCleanupExpired(opts?: any) {
    return this.queueService.addJob(QUEUE_NAMES.CLEANUP, QUEUE_JOB_NAMES.CLEANUP_EXPIRED, {}, opts);
  }

  async scheduleCleanupOrphaned(opts?: any) {
    return this.queueService.addJob(QUEUE_NAMES.CLEANUP, QUEUE_JOB_NAMES.CLEANUP_ORPHANED, {}, opts);
  }

  subscribeToEvent(channel: string, callback: (data: unknown) => void) {
    this.eventSubscriptions.set(channel, callback);
    this.logger.debug({ channel }, 'Event subscription added');
  }

  unsubscribeFromEvent(channel: string) {
    this.eventSubscriptions.delete(channel);
    this.logger.debug({ channel }, 'Event subscription removed');
  }
}
