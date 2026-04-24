import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { REPOSITORY } from '~/common/constants/database';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { ConfigModule } from '~/infrastructure/config/config.module';
import { LoggerModule } from '~/common/logger/logger.module';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { mockRedis, mockRepository } from '~/test/common/mock';
import { UserCacheService } from './user-cache.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CONFIG_PROVIDER } from '~/common/constants/provider';

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule,
        LoggerModule,
        JwtModule.registerAsync({
          inject: [CONFIG_SERVICE],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get('JWT_SECRET'),
            privateKey: configService.get('JWT_PRIVATE_KEY'),
            publicKey: configService.get('JWT_PUBLIC_KEY'),
          }),
        }),
      ],
      controllers: [UserController],
      providers: [
        CacheService,
        RedisService,
        UserCacheService,
        UserService,
        {
          provide: REPOSITORY.USER,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.PERMISSION,
          useValue: mockRepository,
        },
        {
          provide: CONFIG_PROVIDER.REDIS_CLIENT,
          useValue: mockRedis,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
