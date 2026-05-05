/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventReminder, ReminderStatus, ReminderType } from './entities/event-reminder.entity';
import { QueueService } from '~/infrastructure/queue/queue.service';
import { REPOSITORY } from '~/common/constants/database';
import { QUEUE } from '~/common/constants/queue';
import { PinoLogger } from 'nestjs-pino';
import type { Event } from '~/modules/events/entities/event.entity';
import { NotificationService } from '../notifications/notification.service';
import { EmailService } from '~/infrastructure/email/email.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { ClockProvider } from '~/infrastructure/clock/clock.provider';

interface Interval {
  days?: number;
  hours?: number;
  minutes?: number;
}

interface ReminderOffset {
  interval: Interval;
  label: string;
}

export interface ScheduleReminderData {
  eventId: string;
  userId: string;
  orderId: string;
  scheduledAt: Date;
  type: ReminderType;
  subject?: string;
  message?: string;
}

@Injectable()
export class ReminderService {
  constructor(
    @Inject(REPOSITORY.EVENT_REMINDER)
    private readonly reminderRepository: Repository<EventReminder>,
    @Inject(REPOSITORY.EVENT)
    private readonly eventRepository: Repository<Event>,
    private readonly queueService: QueueService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
    private readonly logger: PinoLogger,
  ) {}

  async createReminder(dto: CreateReminderDto, userId: string): Promise<EventReminder> {
    const event = await this.eventRepository.findOne({ where: { id: dto.eventId } });
    if (!event) {
      throw new NotFoundException(`Event ${dto.eventId} not found`);
    }

    return this.scheduleReminder({
      eventId: dto.eventId,
      userId,
      orderId: dto.orderId,
      scheduledAt: new Date(dto.scheduledAt),
      type: dto.type,
      subject: dto.subject,
      message: dto.message,
    });
  }

  async scheduleReminder(data: ScheduleReminderData): Promise<EventReminder> {
    this.logger.info(`Scheduling reminder for event ${data.eventId}, user ${data.userId}`);

    const normalizedSubject = data.subject;
    const normalizedMessage = data.message;
    const existingReminderWhere: Record<string, unknown> = {
      eventId: data.eventId,
      userId: data.userId,
      orderId: data.orderId,
      type: data.type,
    };

    if (normalizedSubject !== undefined) existingReminderWhere.subject = normalizedSubject;
    if (normalizedMessage !== undefined) existingReminderWhere.message = normalizedMessage;

    const existingReminder = await this.reminderRepository.findOne({
      where: existingReminderWhere,
    });

    if (existingReminder) {
      this.logger.info(`Reminder already exists for event ${data.eventId}, user ${data.userId}, order ${data.orderId}`);
      return existingReminder;
    }

    const reminder = this.reminderRepository.create({
      eventId: data.eventId,
      userId: data.userId,
      orderId: data.orderId,
      scheduledAt: data.scheduledAt,
      type: data.type,
      subject: normalizedSubject,
      message: normalizedMessage,
      status: ReminderStatus.PENDING,
    });

    const savedReminder = await this.reminderRepository.save(reminder);

    // Schedule the reminder job
    const now = ClockProvider.now();
    const delay = data.scheduledAt.getTime() - now.getTime();
    if (delay > 0) {
      await this.queueService.addJob(QUEUE.REMINDERS, 'send-reminder', { reminderId: savedReminder.id }, { delay });
    } else {
      this.logger.warn(`Scheduled time is in the past for reminder ${savedReminder.id}, sending immediately`);
      await this.processReminder(savedReminder.id);
    }

    return savedReminder;
  }

  async scheduleRemindersForOrder(orderId: string, eventId: string, userId: string, reminderTimes?: string[]): Promise<void> {
    this.logger.info(`Scheduling reminders for order ${orderId}, event ${eventId}, user ${userId}`);

    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      this.logger.error(`Event ${eventId} not found for scheduling reminders`);
      return;
    }

    // Check if event is in the future
    const now = ClockProvider.now();
    if (new Date(event.startDate) <= now) {
      this.logger.warn(`Event ${eventId} is in the past, skipping reminder scheduling`);
      return;
    }

    const reminderPlans =
      reminderTimes && reminderTimes.length > 0
        ? reminderTimes.map((value) => {
            const parsed = this.parseReminderOffset(value);
            return {
              ...parsed,
              type: ReminderType.EMAIL,
              subject: `Event Reminder: Your event starts in ${parsed.label}!`,
            };
          })
        : [
            { interval: { days: 1 }, type: ReminderType.EMAIL, subject: 'Event Reminder: Your event is tomorrow!' },
            { interval: { hours: 1 }, type: ReminderType.EMAIL, subject: 'Event Reminder: Your event starts in 1 hour!' },
            { interval: { minutes: 15 }, type: ReminderType.NOTIFICATION, subject: 'Event starting soon!' },
          ];

    for (const plan of reminderPlans) {
      const scheduledAt = new Date(event.startDate);
      const interval = plan.interval;

      if (interval.days) {
        scheduledAt.setDate(scheduledAt.getDate() - interval.days);
      } else if (interval.hours) {
        scheduledAt.setHours(scheduledAt.getHours() - interval.hours);
      } else if (interval.minutes) {
        scheduledAt.setMinutes(scheduledAt.getMinutes() - interval.minutes);
      }

      await this.scheduleReminder({
        eventId,
        userId,
        orderId,
        scheduledAt,
        type: plan.type,
        subject: plan.subject,
        message: this.generateReminderMessage(event, interval),
      });
    }
  }

  async processReminder(reminderId: string): Promise<void> {
    this.logger.info(`Processing reminder ${reminderId}`);

    const reminder = await this.reminderRepository.findOne({
      where: { id: reminderId },
      relations: ['event', 'user', 'order', 'order.orderItems'],
    });

    if (!reminder) {
      this.logger.error(`Reminder ${reminderId} not found`);
      return;
    }

    if (reminder.status !== ReminderStatus.PENDING) {
      this.logger.warn(`Reminder ${reminderId} is not pending (status: ${reminder.status})`);
      return;
    }

    try {
      if (reminder.type === ReminderType.EMAIL || reminder.type === ReminderType.BOTH) {
        await this.sendEmailReminder(reminder);
      }

      if (reminder.type === ReminderType.NOTIFICATION || reminder.type === ReminderType.BOTH) {
        await this.sendNotificationReminder(reminder);
      }

      // Mark as sent
      await this.reminderRepository.update(reminder.id, {
        status: ReminderStatus.SENT,
        sentAt: ClockProvider.now(),
      });

      this.logger.info(`Reminder ${reminderId} sent successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send reminder ${reminderId}: ${errorMessage}`);

      const retryCount = reminder.retryCount + 1;

      if (retryCount <= reminder.maxRetries) {
        // Schedule retry with exponential backoff
        const retryDelay = Math.pow(2, retryCount) * 60000; // 1min, 2min, 4min

        await this.reminderRepository.update(reminder.id, {
          retryCount,
          errorMessage,
        });

        await this.queueService.addJob(QUEUE.REMINDERS, 'send-reminder', { reminderId: reminder.id }, { delay: retryDelay });

        this.logger.info(`Scheduled retry ${retryCount}/${reminder.maxRetries} for reminder ${reminderId}`);
      } else {
        // Mark as failed
        await this.reminderRepository.update(reminder.id, {
          status: ReminderStatus.FAILED,
          retryCount,
          errorMessage,
        });

        this.logger.error(`Reminder ${reminderId} failed after ${reminder.maxRetries} retries`);
      }
    }
  }

  private async sendEmailReminder(reminder: EventReminder): Promise<void> {
    if (!reminder.user?.email) {
      this.logger.warn(`Cannot send email reminder: user email not found for reminder ${reminder.id}`);
      return;
    }

    try {
      const subject = reminder.subject || `Reminder: ${reminder.event?.title || 'Upcoming Event'}`;
      const message = reminder.message || this.generateReminderMessage(reminder.event);

      const htmlContent = this.generateReminderHtml(reminder, message);

      await this.emailService.sendEmail({
        to: reminder.user.email,
        subject,
        html: htmlContent,
        text: message,
      });

      this.logger.info(`Email reminder sent successfully to ${reminder.user.email} for event ${reminder.event?.title}`);
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          reminderId: reminder.id,
          userEmail: reminder.user.email,
        },
        'Failed to send email reminder',
      );
      throw error;
    }
  }

  private generateReminderHtml(reminder: EventReminder, message: string): string {
    const event = reminder.event;
    const eventName = event?.title || 'Event';
    const eventDate = event?.startDate ? new Date(event.startDate).toLocaleString() : 'TBD';
    const eventLocation = event?.location || 'TBD';
    const order = reminder.order;
    const orderTicketCount = order?.orderItems?.reduce((total, item) => total + Number(item.quantity ?? 0), 0) ?? 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Event Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .event-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🗓️ Event Reminder</h1>
            <p>${message}</p>
          </div>
          <div class="content">
            <div class="event-details">
              <h2>${eventName}</h2>
              <p><strong>📅 Date:</strong> ${eventDate}</p>
              <p><strong>📍 Location:</strong> ${eventLocation}</p>
              ${event?.description ? `<p><strong>📝 Description:</strong> ${event.description}</p>` : ''}
            </div>
            ${
              order
                ? `
            <div class="event-details">
              <h3>Order Details</h3>
              <p><strong>Order ID:</strong> ${order.id}</p>
              <p><strong>Ticket Quantity:</strong> ${orderTicketCount}</p>
              <p><strong>Total Amount:</strong> ${order.totalAmount}</p>
            </div>
            `
                : ''
            }
            <p>Don't forget to bring your ticket and arrive on time!</p>
          </div>
          <div class="footer">
            <p>This is an automated reminder. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private async sendNotificationReminder(reminder: EventReminder): Promise<void> {
    await this.notificationService.createNotification({
      userId: reminder.userId,
      type: 'EVENT_REMINDER',
      title: reminder.subject || 'Event Reminder',
      message: reminder.message || this.generateReminderMessage(reminder.event),
    });
  }

  private generateReminderMessage(event: Event, interval?: Interval): string {
    let timeText = 'soon';

    if (interval) {
      if (interval.days) {
        timeText = `${interval.days} day${Number(interval.days) > 1 ? 's' : ''}`;
      } else if (interval.hours) {
        timeText = `${interval.hours} hour${Number(interval.hours) > 1 ? 's' : ''}`;
      } else {
        timeText = `${interval.minutes} minute${Number(interval.minutes) > 1 ? 's' : ''}`;
      }
    }

    return `Your event "${event.title}" is starting ${timeText} on ${event.startDate.toLocaleDateString()} at ${event.startDate.toLocaleTimeString()}. Location: ${event.location}`;
  }

  private parseReminderOffset(value: string): ReminderOffset {
    const normalized = value.trim().toLowerCase();
    const match = new RegExp(/^(\d+)([hdm])$/).exec(normalized);

    if (!match) {
      throw new Error(`Invalid reminder time format: ${value}`);
    }

    const amount = Number(match[1]);
    const unit = match[2];

    if (unit === 'd') {
      return { interval: { days: amount }, label: `${amount} day${amount > 1 ? 's' : ''}` };
    }

    if (unit === 'h') {
      return { interval: { hours: amount }, label: `${amount} hour${amount > 1 ? 's' : ''}` };
    }

    return { interval: { minutes: amount }, label: `${amount} minute${amount > 1 ? 's' : ''}` };
  }

  async getPendingReminders(): Promise<EventReminder[]> {
    // Use fake time in test environment, real time in production
    const currentTime = process.env.NODE_ENV === 'test' ? ClockProvider.now() : new Date();

    return this.reminderRepository.find({
      where: {
        status: ReminderStatus.PENDING,
        scheduledAt: LessThan(currentTime),
      },
      relations: ['event', 'user', 'order'],
    });
  }

  async getUserReminders(userId: string): Promise<EventReminder[]> {
    return this.reminderRepository.find({
      where: { userId },
      relations: ['event'],
      order: { scheduledAt: 'DESC' },
    });
  }

  async cancelReminder(reminderId: string): Promise<void> {
    const result = await this.reminderRepository.update(reminderId, {
      status: ReminderStatus.CANCELLED,
    });

    if (result.affected === 0) {
      throw new NotFoundException(`Reminder ${reminderId} not found`);
    }
  }

  async cancelRemindersForOrder(orderId: string): Promise<void> {
    await this.reminderRepository.update(
      {
        orderId,
        status: ReminderStatus.PENDING,
      },
      { status: ReminderStatus.CANCELLED },
    );
  }

  // Process overdue reminders every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async processOverdueReminders(): Promise<void> {
    try {
      const overdueReminders = await this.getPendingReminders();

      for (const reminder of overdueReminders) {
        await this.processReminder(reminder.id);
      }
    } catch (error) {
      this.logger.error('Error processing overdue reminders:', error);
    }
  }
}
