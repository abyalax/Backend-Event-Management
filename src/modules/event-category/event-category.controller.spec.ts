import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { REPOSITORY } from '~/common/constants/database';
import { env } from '~/config/env';
import { mockRepository } from '~/test/common/mock';
import { AuthModule } from '../auth/auth.module';
import { UserService } from '../user/user.service';
import { EventCategoryController } from './event-category.controller';
import { EventCategoryService } from './event-category.service';

describe('EventCategoryController', () => {
  let controller: EventCategoryController;
  let eventCategoryService: EventCategoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AuthModule,
        JwtModule.register({
          secret: env.JWT_SECRET,
          privateKey: env.JWT_PRIVATE_KEY,
          publicKey: env.JWT_PUBLIC_KEY,
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
