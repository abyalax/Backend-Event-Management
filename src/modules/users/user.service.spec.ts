import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { CONFIG_SERVICE } from '~/infrastructure/config/config.provider';
import { mockRedis, mockRepository, mockConfigService } from '~/test/common/mock';
import { Permission } from '../auth/entity/permission.entity';
import { User } from './entity/user.entity';
import { UserCacheService } from './user-cache.service';
import { UserService } from './user.service';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { PinoLogger } from 'nestjs-pino';

describe('UserService', () => {
  let service: UserService;
  let userRepository: Repository<User>;
  let permissionRepository: Repository<Permission>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          privateKey: 'test-private-key',
          publicKey: 'test-public-key',
        }),
      ],
      providers: [
        UserService,
        {
          provide: CONFIG_SERVICE,
          useValue: mockConfigService,
        },
        {
          provide: PinoLogger,
          useValue: {
            setContext: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
        UserCacheService,
        CacheService,
        RedisService,
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

    service = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(REPOSITORY.USER);
    permissionRepository = module.get<Repository<Permission>>(REPOSITORY.PERMISSION);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(userRepository).toBeDefined();
    expect(permissionRepository).toBeDefined();
  });
});
