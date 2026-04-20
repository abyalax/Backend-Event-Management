import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CacheService {
  private readonly LOCK_SUFFIX = ':lock';
  private readonly LOCK_TTL = 10; // seconds

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
      console.warn(`Cache read error for key ${key}:`, error);
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
          console.warn(`Cache write error for key ${key}:`, error);
        }

        return data;
      } else {
        // 4. Lock not acquired - wait & retry from cache (other process is fetching)
        await this.waitForCache(key, lockKey);
        try {
          const cached = await this.redisService.get<T>(key);
          if (cached) return cached;
        } catch (error) {
          console.warn(`Cache retry read error for key ${key}:`, error);
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
          console.warn(`Lock release error for key ${lockKey}:`, error);
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
      console.error(`Lock acquire error for key ${lockKey}:`, error);
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
    } catch (error) {
      console.error(`Lock release error for key ${lockKey}:`, error);
    }
  }

  /**
   * Wait for cache to be populated by lock holder (with timeout)
   */
  private async waitForCache(key: string, lockKey: string, maxWaitMs: number = 5000): Promise<void> {
    const startTime = Date.now();
    const pollIntervalMs = 100;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        // Check if lock is released
        const lockExists = await this.redisService.exists(lockKey);
        if (!lockExists) {
          // Lock released, cache should be ready
          return;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      } catch (error) {
        console.warn(`Wait for cache error for key ${key}:`, error);
        return;
      }
    }

    console.warn(`Timeout waiting for cache key ${key}`);
  }

  /**
   * Clear cache by pattern
   */
  async clearByPattern(pattern: string): Promise<number> {
    const client = this.redisService.getClient();
    const keys = await client.keys(pattern);

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
      console.error('Rate limit error:', error);
      throw error;
    }
  }
}
