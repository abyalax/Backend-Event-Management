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
import { User } from './entity/user.entity';
import { UserCacheService } from './user-cache.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let userRepository: Repository<User>;
  let permissionRepository: Repository<Permission>;

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
      controllers: [UserController],
      providers: [
        UserService,
        UserCacheService,
        CacheService,
        RedisService,
        PermissionsGuard,
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
