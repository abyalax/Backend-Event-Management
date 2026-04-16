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

/**
describe('get', () => {
  it('should return transformed user DTOs', async () => {
    const mockUsers = [
      { id: 1, name: 'User 1', email: 'user1@example.com' } as User,
      { id: 2, name: 'User 2', email: 'user2@example.com' } as User,
    ];

    jest.spyOn(userService, 'findAll').mockResolvedValue(mockUsers);

    const result = await controller.get();

    expect(userService.findAll).toHaveBeenCalled();
    expect(result).toEqual(
      plainToInstance(UserDto, mockUsers, {
        excludeExtraneousValues: true,
      }),
    );
  });
});

describe('create', () => {
  it('should create a new user', async () => {
    const createUserDto: CreateUserDto = {
      name: 'New User',
      email: 'newuser@example.com',
      password: 'password123',
    };

    const mockUser = { id: '3', name: 'New User', email: 'newuser@example.com', password: '', roles: [] };

    jest.spyOn(userService, 'create').mockResolvedValue(mockUser);

    const result = await controller.create(createUserDto);

    expect(userService.create).toHaveBeenCalledWith(createUserDto);
    expect(result).toEqual(mockUser);
  });
});

describe('findAll', () => {
  it('should return all users', async () => {
    const mockUsers = [
      { id: '1', name: 'User 1', email: 'user1@example.com', password: '', roles: [] },
      { id: '2', name: 'User 2', email: 'user2@example.com', password: '', roles: [] },
    ];

    jest.spyOn(userService, 'findAll').mockResolvedValue(mockUsers as User[]);

    const result = await controller.findAll();

    expect(userService.findAll).toHaveBeenCalled();
    expect(result).toEqual(mockUsers);
  });
});

describe('findOne', () => {
  it('should return a single user by ID', async () => {
    const userId = '1';
    const mockUser: User = { id: '1', name: 'User 1', email: 'user1@example.com', password: '', roles: [] };

    jest.spyOn(userService, 'findOneBy').mockResolvedValue(mockUser);

    const result = await controller.findOne(userId);

    expect(userService.findOneBy).toHaveBeenCalledWith({ id: userId });
    expect(result).toEqual(mockUser);
  });
});

describe('update', () => {
  it('should update a user', async () => {
    const userId = '1';
    const updateUserDto: UpdateUserDto = {
      name: 'Updated User',
      email: 'updated@example.com',
    };

    const mockUpdateResult = { affected: 1, raw: {}, generatedMaps: [] };

    jest.spyOn(userService, 'update').mockResolvedValue(mockUpdateResult);

    const result = await controller.update(userId, updateUserDto);

    expect(userService.update).toHaveBeenCalledWith(1, updateUserDto);
    expect(result).toEqual(mockUpdateResult);
  });
});

describe('remove', () => {
  it('should remove a user', async () => {
    const userId = '1';
    const mockDeleteResult = { affected: 1, raw: {}, generatedMaps: [] };

    jest.spyOn(userService, 'remove').mockResolvedValue(mockDeleteResult);

    const result = await controller.remove(userId);

    expect(userService.remove).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockDeleteResult);
  });
});
 */
