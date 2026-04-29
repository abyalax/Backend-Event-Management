import { Injectable } from '@nestjs/common';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { ORDER_TTL_MINUTES } from '~/common/constants/order-status.enum';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class TicketLockService {
  constructor(
    private readonly redisService: RedisService,
    private readonly logger: PinoLogger,
  ) {}

  async lockTicketQuota(ticketId: string, orderId: string, quantity: number): Promise<boolean> {
    const lockKey = `ticket_lock:${ticketId}:${orderId}`;
    const quotaKey = `ticket_quota:${ticketId}`;

    try {
      const result = await this.redisService
        .getClient()
        .multi()
        .decrby(quotaKey, quantity)
        .set(lockKey, quantity.toString(), 'EX', ORDER_TTL_MINUTES * 60)
        .exec();

      if (!result) {
        this.logger.error(`Failed to execute Redis transaction for ticket ${ticketId}`);
        return false;
      }

      const remainingQuota = Number.parseInt(result[0][1] as string, 10);

      if (remainingQuota < 0) {
        // Rollback the quota decrement
        await this.redisService.getClient().incrby(quotaKey, quantity);
        await this.redisService.getClient().del(lockKey);
        this.logger.warn(`Insufficient quota for ticket ${ticketId}. Requested: ${quantity}, Available: ${remainingQuota + quantity}`);
        return false;
      }

      this.logger.info(`Successfully locked ${quantity} tickets for ticket ${ticketId}, order ${orderId}. Remaining quota: ${remainingQuota}`);
      return true;
    } catch (error) {
      this.logger.error(`Error locking ticket quota for ticket ${ticketId}:`, error);
      return false;
    }
  }

  async releaseTicketQuota(ticketId: string, orderId: string): Promise<void> {
    const lockKey = `ticket_lock:${ticketId}:${orderId}`;
    const quotaKey = `ticket_quota:${ticketId}`;

    try {
      const lockedQuantity = await this.redisService.getClient().get(lockKey);

      if (lockedQuantity) {
        await this.redisService.getClient().multi().incrby(quotaKey, Number.parseInt(lockedQuantity, 10)).del(lockKey).exec();

        this.logger.info(`Released ${lockedQuantity} tickets for ticket ${ticketId}, order ${orderId}`);
      }
    } catch (error) {
      this.logger.error(`Error releasing ticket quota for ticket ${ticketId}, order ${orderId}:`, error);
    }
  }

  async setInitialQuota(ticketId: string, totalQuota: number): Promise<void> {
    const quotaKey = `ticket_quota:${ticketId}`;

    try {
      await this.redisService.getClient().set(quotaKey, totalQuota.toString());
      this.logger.info(`Set initial quota ${totalQuota} for ticket ${ticketId}`);
    } catch (error) {
      this.logger.error(`Error setting initial quota for ticket ${ticketId}:`, error);
    }
  }

  async getAvailableQuota(ticketId: string): Promise<number> {
    const quotaKey = `ticket_quota:${ticketId}`;

    try {
      const quota = await this.redisService.getClient().get(quotaKey);
      return quota ? Number.parseInt(quota, 10) : 0;
    } catch (error) {
      this.logger.error(`Error getting available quota for ticket ${ticketId}:`, error);
      return 0;
    }
  }

  async extendLock(ticketId: string, orderId: string, additionalMinutes: number = ORDER_TTL_MINUTES): Promise<boolean> {
    const lockKey = `ticket_lock:${ticketId}:${orderId}`;

    try {
      const result = await this.redisService.getClient().expire(lockKey, additionalMinutes * 60);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error extending lock for ticket ${ticketId}, order ${orderId}:`, error);
      return false;
    }
  }

  async getLockInfo(ticketId: string, orderId: string): Promise<{ quantity: number; ttl: number } | null> {
    const lockKey = `ticket_lock:${ticketId}:${orderId}`;

    try {
      const multi = await this.redisService.getClient().multi().get(lockKey).ttl(lockKey).exec();

      if (!multi || !multi?.[0]?.[1]) {
        return null;
      }

      return {
        quantity: Number.parseInt(multi[0][1] as string, 10),
        ttl: multi[1][1] as number,
      };
    } catch (error) {
      this.logger.error(`Error getting lock info for ticket ${ticketId}, order ${orderId}:`, error);
      return null;
    }
  }
}
