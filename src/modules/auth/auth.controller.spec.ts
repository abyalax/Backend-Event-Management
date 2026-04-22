import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { REPOSITORY } from '~/common/constants/database';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { ConfigModule } from '~/infrastructure/config/config.module';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { REDIS_CLIENT } from '~/infrastructure/redis/redis.constant';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { mockRedis, mockRepository } from '~/test/common/mock';
import { UserService } from '../users/user.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule,
        JwtModule.registerAsync({
          inject: [CONFIG_SERVICE],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get('JWT_SECRET'),
            privateKey: configService.get('JWT_PRIVATE_KEY'),
            publicKey: configService.get('JWT_PUBLIC_KEY'),
          }),
        }),
      ],
      providers: [
        AuthService,
        CacheService,
        RedisService,
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
          provide: REDIS_CLIENT,
          useValue: mockRedis,
        },
      ],
      controllers: [AuthController],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(authService).toBeDefined();
  });
});
