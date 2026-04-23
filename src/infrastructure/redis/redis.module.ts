import { DynamicModule, Global, InjectionToken, Module } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { RedisService } from './redis.service';
import { CONFIG_PROVIDER } from '~/common/constants/provider';

@Global()
@Module({})
export class RedisModule {
  static forRootAsync(options: {
    useFactory: (...args: unknown[]) => Promise<RedisOptions> | RedisOptions;
    inject?: InjectionToken[];
  }): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: CONFIG_PROVIDER.REDIS_OPTION,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: CONFIG_PROVIDER.REDIS_CLIENT,
          useFactory: (opts: RedisOptions) => {
            const client = new Redis(opts);
            client.on('connect', () => console.log('Redis connected'));
            client.on('error', (err) => console.error('Redis error:', err));
            return client;
          },
          inject: [CONFIG_PROVIDER.REDIS_OPTION],
        },
        RedisService,
      ],
      exports: [CONFIG_PROVIDER.REDIS_CLIENT, RedisService],
    };
  }
}
