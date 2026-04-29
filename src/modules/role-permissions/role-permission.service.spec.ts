import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { mockRedis, mockRepository, mockConfigService, mockCacheService } from '~/test/common/mock';
import { Permission } from '../auth/entity/permission.entity';
import { RoleService } from './role-permission.service';
import { Role } from './entity/role.entity';
import { RoleCacheService } from './role-permission-cache.service';
import { CONFIG_SERVICE } from '~/infrastructure/config/config.provider';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { PinoLogger } from 'nestjs-pino';

describe('RolePermissionService', () => {
  let service: RoleService;
  let serviceCache: RoleCacheService;
  let repository: Repository<Role>;
  let permission: Repository<Permission>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        RoleService,
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
        {
          provide: REPOSITORY.ROLE,
          useValue: mockRepository,
        },
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
        {
          provide: 'CacheService',
          useValue: mockCacheService,
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            getLock: jest.fn(),
            releaseLock: jest.fn(),
          },
        },
        RedisService,
        RoleCacheService,
        RoleService,
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    serviceCache = module.get<RoleCacheService>(RoleCacheService);
    repository = module.get<Repository<Role>>(REPOSITORY.ROLE);
    permission = module.get<Repository<Permission>>(REPOSITORY.PERMISSION);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(serviceCache).toBeDefined();
    expect(repository).toBeDefined();
    expect(permission).toBeDefined();
  });
});
