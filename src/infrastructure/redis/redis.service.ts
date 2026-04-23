import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { PinoLogger } from 'nestjs-pino';
import { CONFIG_PROVIDER } from '~/common/constants/provider';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;

  constructor(
    private readonly logger: PinoLogger,
    @Inject(CONFIG_PROVIDER.REDIS_CLIENT) private readonly client: Redis,
  ) {}

  async onModuleInit() {
    try {
      this.publisher = new Redis(this.client.options);
      this.subscriber = new Redis(this.client.options);

      await this.client.ping();
      this.logger.info('RedisService initialized');
    } catch (error) {
      this.logger.error('Failed to initialize RedisService:', error);
      throw error;
    }
  }

  async publish(channel: string, message: unknown) {
    if (!this.publisher) throw new Error('Publisher not initialized');
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: unknown) => void) {
    if (!this.subscriber) throw new Error('Subscriber not initialized');
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        callback(JSON.parse(msg));
      }
    });
  }

  async onModuleDestroy() {
    const closeConnection = async (redis: Redis | null, name: string) => {
      if (!redis) return;
      redis.removeAllListeners('error');

      try {
        if (redis.status === 'reconnecting') {
          this.logger.info(`Forcing disconnect for ${name} due to reconnecting status`);
          redis.disconnect();
          return;
        }

        if (['connect', 'ready'].includes(redis.status)) {
          // Beri timeout pada quit() agar tidak menggantung jika server Redis bermasalah
          const quitWithTimeout = Promise.race([redis.quit(), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))]);

          await quitWithTimeout;
        }
      } catch {
        redis.disconnect();
      }
    };

    await Promise.all([
      closeConnection(this.publisher, 'publisher'),
      closeConnection(this.subscriber, 'subscriber'),
      closeConnection(this.client, 'main client'),
    ]);

    this.logger.info('Redis connections cleanup completed');
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const count = await this.client.exists(key);
    return count > 0;
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  getClient(): Redis {
    return this.client;
  }
}
