import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { ConfigModule } from '~/infrastructure/config/config.module';
import { LoggerModule } from '~/common/logger/logger.module';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { REDIS_CLIENT } from '~/infrastructure/redis/redis.constant';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { mockRedis, mockRepository } from '~/test/common/mock';
import { Permission } from '../auth/entity/permission.entity';
import { RoleService } from './role.service';
import { Role } from './entity/role.entity';
import { RoleCacheService } from './role-cache.service';

describe('RoleService', () => {
  let service: RoleService;
  let serviceCache: RoleCacheService;
  let repository: Repository<Role>;
  let permission: Repository<Permission>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, LoggerModule],
      providers: [
        CacheService,
        RedisService,
        RoleCacheService,
        RoleService,
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
          provide: REDIS_CLIENT,
          useValue: mockRedis,
        },
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
