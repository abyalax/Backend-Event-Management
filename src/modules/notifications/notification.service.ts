import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { PinoLogger } from 'nestjs-pino';
import { REPOSITORY } from '~/common/constants/database';

export interface CreateNotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
}

@Injectable()
export class NotificationService {
  constructor(
    @Inject(REPOSITORY.NOTIFICATION)
    private readonly notificationRepository: Repository<Notification>,
    private readonly logger: PinoLogger,
  ) {}

  async createNotification(data: CreateNotificationData): Promise<Notification> {
    this.logger.debug(`Creating notification for user ${data.userId}`);

    const notification = this.notificationRepository.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      isRead: false,
    });

    return this.notificationRepository.save(notification);
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationRepository.update(notificationId, { isRead: true });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update({ userId }, { isRead: true });
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await this.notificationRepository.delete(notificationId);
  }
}
