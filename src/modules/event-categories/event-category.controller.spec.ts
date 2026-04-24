import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { REPOSITORY } from '~/common/constants/database';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { ConfigModule } from '~/infrastructure/config/config.module';
import { LoggerModule } from '~/common/logger/logger.module';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { mockRedis, mockRepository } from '~/test/common/mock';
import { UserService } from '../users/user.service';
import { EventCategoryController } from './event-category.controller';
import { EventCategoryService } from './event-category.service';
import { CONFIG_PROVIDER } from '~/common/constants/provider';

describe('EventCategoryController', () => {
  let controller: EventCategoryController;
  let eventCategoryService: EventCategoryService;

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
      controllers: [EventCategoryController],
      providers: [
        EventCategoryService,
        {
          provide: REPOSITORY.EVENT_CATEGORY,
          useValue: mockRepository,
        },
        {
          provide: UserService,
          useValue: {
            findOneBy: jest.fn().mockResolvedValue({
              id: 1,
              name: 'Test User',
              email: 'test@example.com',
              roles: [],
            }),
          },
        },
        RedisService,
        {
          provide: CONFIG_PROVIDER.REDIS_CLIENT,
          useValue: mockRedis,
        },
      ],
    }).compile();

    controller = module.get<EventCategoryController>(EventCategoryController);
    eventCategoryService = module.get<EventCategoryService>(EventCategoryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(eventCategoryService).toBeDefined();
  });
});
