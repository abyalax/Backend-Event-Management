import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CacheService {
  private readonly LOCK_SUFFIX = ':lock';
  private readonly LOCK_TTL = 10; // seconds
  private readonly LOCK_CHANNEL_PREFIX = 'cache-lock-release';
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Get from cache or fetch and set with distributed lock
   * Prevents cache stampede by using NX (SET if Not eXists) and EX (EXpire)
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number = 300): Promise<T> {
    // 1. Try get from cache first
    try {
      const cached = await this.redisService.get<T>(key);
      if (cached) return cached;
    } catch (error) {
      this.logger.warn({ key, error }, 'Cache read error');
    }

    // 2. Try acquire lock (NX = only if not exists, EX = auto expire)
    const lockKey = `${key}${this.LOCK_SUFFIX}`;
    const lockValue = Date.now().toString();
    const acquired = await this.acquireLock(lockKey, lockValue);

    try {
      if (acquired) {
        // 3. Lock acquired - fetch data and set cache
        const data = await fetcher();

        try {
          await this.redisService.set(key, data, ttlSeconds);
        } catch (error) {
          this.logger.warn({ key, error }, 'Cache write error');
        }

        return data;
      } else {
        // 4. Lock not acquired - wait & retry from cache (other process is fetching)
        await this.waitForCache(key, lockKey);
        try {
          const cached = await this.redisService.get<T>(key);
          if (cached) return cached;
        } catch (error) {
          this.logger.warn({ key, error }, 'Cache retry read error');
        }

        // Fallback: fetch data without cache
        return await fetcher();
      }
    } finally {
      // 5. Always release lock
      if (acquired) {
        try {
          await this.releaseLock(lockKey, lockValue);
        } catch (error) {
          this.logger.warn({ lockKey, error }, 'Lock release error');
        }
      }
    }
  }

  /**
   * Acquire distributed lock using SET NX EX
   * Returns true if lock acquired, false if already locked
   */
  private async acquireLock(lockKey: string, lockValue: string): Promise<boolean> {
    try {
      const client = this.redisService.getClient();
      // SET key value EX ttl NX - only set if not exists, with expiration
      const result = await client.set(lockKey, lockValue, 'EX', this.LOCK_TTL, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.error({ lockKey, error }, 'Lock acquire error');
      return false;
    }
  }

  /**
   * Release lock using Lua script (atomic compare-and-delete)
   * Prevents accidentally deleting lock acquired by another process
   */
  private async releaseLock(lockKey: string, lockValue: string): Promise<void> {
    try {
      const client = this.redisService.getClient();
      // Lua script: only delete if value matches (prevent releasing other's lock)
      await client.eval(`if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`, 1, lockKey, lockValue);
      await this.redisService.publish(this.lockChannel(lockKey), { lockKey });
    } catch (error) {
      this.logger.error({ lockKey, error }, 'Lock release error');
    }
  }

  /**
   * Wait for cache to be populated by lock holder (with timeout)
   */
  private async waitForCache(key: string, lockKey: string, maxWaitMs: number = 5000): Promise<void> {
    const channel = this.lockChannel(lockKey);
    let settled = false;

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.logger.warn({ key, lockKey }, 'Timeout waiting for cache key');
        resolve();
      }, maxWaitMs);

      this.redisService
        .subscribe(channel, () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve();
        })
        .catch((error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          this.logger.warn({ key, lockKey, error }, 'Wait for cache error');
          resolve();
        });
    });
  }

  /**
   * Clear cache by pattern
   */
  async clearByPattern(pattern: string): Promise<number> {
    const client = this.redisService.getClient();
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, batch] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');

    if (keys.length === 0) return 0;

    return client.del(...keys);
  }

  /**
   * Clear specific cache key and its lock
   */
  async clear(key: string): Promise<void> {
    await this.redisService.del(key);
    await this.redisService.del(`${key}${this.LOCK_SUFFIX}`);
  }

  /**
   * Rate limiting helper
   */
  async isRateLimited(
    key: string,
    maxAttempts: number = 10,
    windowSeconds: number = 60,
  ): Promise<{ limited: boolean; remaining: number; resetIn: number }> {
    try {
      const attempts = await this.redisService.incr(key);

      if (attempts === 1) {
        await this.redisService.getClient().expire(key, windowSeconds);
      }

      const ttl = await this.redisService.ttl(key);
      const limited = attempts > maxAttempts;

      return {
        limited,
        remaining: Math.max(0, maxAttempts - attempts),
        resetIn: ttl || windowSeconds,
      };
    } catch (error) {
      this.logger.error({ error }, 'Rate limit error');
      throw error;
    }
  }

  private lockChannel(lockKey: string): string {
    return `${this.LOCK_CHANNEL_PREFIX}:${lockKey}`;
  }
}
