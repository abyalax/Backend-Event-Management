import { DynamicModule, Global, Module } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { REDIS_CLIENT, REDIS_OPTIONS } from './redis.constant';
import { RedisService } from './redis.service';

@Global()
@Module({})
export class RedisModule {
  static forRootAsync(options: { useFactory: (...args: unknown[]) => Promise<RedisOptions> | RedisOptions; inject?: any[] }): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: REDIS_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: REDIS_CLIENT,
          useFactory: (opts: RedisOptions) => {
            const client = new Redis(opts);
            client.on('connect', () => console.log('Redis connected'));
            client.on('error', (err) => console.error('Redis error:', err));
            return client;
          },
          inject: [REDIS_OPTIONS],
        },
        RedisService,
      ],
      exports: [REDIS_CLIENT, RedisService],
    };
  }
}
