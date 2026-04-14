import { Test, TestingModule } from '@nestjs/testing';
import { REPOSITORY } from '~/common/constants/database';
import { mockRepository } from '~/test/common/mock';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        UserService,
        {
          provide: REPOSITORY.USER,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.PERMISSION,
          useValue: mockRepository,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
