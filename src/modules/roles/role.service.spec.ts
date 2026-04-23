import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { PermissionsGuard } from '~/common/guards/permission.guard';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { ConfigModule } from '~/infrastructure/config/config.module';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { REDIS_CLIENT } from '~/infrastructure/redis/redis.constant';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { mockRedis, mockRepository } from '~/test/common/mock';
import { Permission } from '../auth/entity/permission.entity';
import { RoleService } from './role.service';
import { Role } from './entity/role.entity';
import { RoleController } from './role.controller';
import { RoleCacheService } from './role-cache.service';

describe('RoleService', () => {
  let service: RoleService;
  let serviceCache: RoleCacheService;
  let repository: Repository<Role>;
  let permission: Repository<Permission>;

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
      controllers: [RoleController],
      providers: [
        RedisService,
        CacheService,
        RoleCacheService,
        RoleService,
        PermissionsGuard,
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
    repository = module.get<Repository<Role>>(REPOSITORY.USER);
    permission = module.get<Repository<Permission>>(REPOSITORY.PERMISSION);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(serviceCache).toBeDefined();
    expect(repository).toBeDefined();
    expect(permission).toBeDefined();
  });
});
