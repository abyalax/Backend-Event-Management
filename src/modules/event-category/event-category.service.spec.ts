import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { mockRepository } from '~/test/common/mock';
import { AuthModule } from '../auth/auth.module';
import { EventCategory } from './entity/event-category.entity';
import { EventCategoryService } from './event-category.service';

describe('EventCategoryService', () => {
  let service: EventCategoryService;
  let categoryRepository: Repository<EventCategory>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
      providers: [
        EventCategoryService,
        {
          provide: REPOSITORY.EVENT_CATEGORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<EventCategoryService>(EventCategoryService);
    categoryRepository = module.get<Repository<EventCategory>>(REPOSITORY.EVENT_CATEGORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(categoryRepository).toBeDefined();
  });
});
