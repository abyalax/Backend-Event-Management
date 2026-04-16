import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { mockRepository } from '~/test/common/mock';
import { Permission } from '../auth/entity/permission.entity';
import { User } from './entity/user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let userRepository: Repository<User>;
  let permissionRepository: Repository<Permission>;

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
/**
describe('getRefreshToken', () => {
  it('should return refresh token for user', async () => {
    const userId = '1';
    const mockUser = { id: 1, refreshToken: 'refresh_token' };

    jest.spyOn(userRepository, 'findOneBy').mockResolvedValue(mockUser);

    const result = await service.getRefreshToken(userId);

    expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: userId });
    expect(result).toBe('refresh_token');
  });

  it('should return null if user not found', async () => {
    const userId = '999';

    jest.spyOn(userRepository, 'findOneBy').mockResolvedValue(null);

    const result = await service.getRefreshToken(userId);

    expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: userId });
    expect(result).toBeNull();
  });
});

describe('getFlattenPermissions', () => {
  it('should return flattened permissions for user', async () => {
    const userId = '1';
    const mockRawPermissions = [{ key: 'read:users' }, { key: 'write:users' }];

    const mockQueryBuilder = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(mockRawPermissions),
    };

    jest.spyOn(permissionRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder);

    const result = await service.getFlattenPermissions(userId);

    expect(permissionRepository.createQueryBuilder).toHaveBeenCalledWith('permission');
    expect(mockQueryBuilder.distinct).toHaveBeenCalledWith(true);
    expect(mockQueryBuilder.innerJoin).toHaveBeenCalledTimes(2);
    expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.id = :userId', { userId });
    expect(mockQueryBuilder.select).toHaveBeenCalledWith('permission.key', 'key');
    expect(result).toEqual(['read:users', 'write:users']);
  });
});

describe('getFullPermissions', () => {
  it('should return full permissions for user', async () => {
    const userId = '1';
    const mockPermissions = [
      { id: 1, key: 'read:users', name: 'Read Users' },
      { id: 2, key: 'write:users', name: 'Write Users' },
    ] as Permission[];

    const mockQueryBuilder = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(mockPermissions),
    };

    jest.spyOn(permissionRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder);

    const result = await service.getFullPermissions(userId);

    expect(permissionRepository.createQueryBuilder).toHaveBeenCalledWith('permission');
    expect(mockQueryBuilder.distinct).toHaveBeenCalledWith(true);
    expect(mockQueryBuilder.innerJoin).toHaveBeenCalledTimes(2);
    expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.id = :userId', { userId });
    expect(result).toEqual(mockPermissions);
  });
});

describe('saveRefreshToken', () => {
  it('should save refresh token for user', async () => {
    const userId = '1';
    const refreshToken = 'new_refresh_token';
    const mockUpdateResult = { affected: 1 };

    jest.spyOn(userRepository, 'update').mockResolvedValue(mockUpdateResult as any);

    await service.saveRefreshToken(userId, refreshToken);

    expect(userRepository.update).toHaveBeenCalledWith(userId, { refreshToken });
  });
});

describe('removeRefreshToken', () => {
  it('should remove refresh token for user', async () => {
    const userId = '1';
    const mockUpdateResult = { affected: 1 };

    jest.spyOn(userRepository, 'update').mockResolvedValue(mockUpdateResult as any);

    await service.removeRefreshToken(userId);

    expect(userRepository.update).toHaveBeenCalledWith(userId, { refreshToken: null });
  });
});

describe('findAll', () => {
  it('should return all users', async () => {
    const mockUsers = [
      { id: 1, name: 'User 1', email: 'user1@example.com' } as User,
      { id: 2, name: 'User 2', email: 'user2@example.com' } as User,
    ];

    jest.spyOn(userRepository, 'find').mockResolvedValue(mockUsers);

    const result = await service.findAll();

    expect(userRepository.find).toHaveBeenCalled();
    expect(result).toEqual(mockUsers);
  });
});

describe('find', () => {
  it('should return users with params', async () => {
    const params = { where: { status: 'active' } };
    const mockUsers = [{ id: 1, name: 'User 1', email: 'user1@example.com', status: 'active' } as User];

    jest.spyOn(userRepository, 'find').mockResolvedValue(mockUsers);

    const result = await service.find(params);

    expect(userRepository.find).toHaveBeenCalledWith(params);
    expect(result).toEqual(mockUsers);
  });
});

describe('create', () => {
  it('should create a new user', async () => {
    const createUserDto: CreateUserDto = {
      name: 'New User',
      email: 'newuser@example.com',
      password: 'password123',
    };

    const mockUser = { id: 3, name: 'New User', email: 'newuser@example.com' } as User;

    jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);

    const result = await service.create(createUserDto);

    expect(userRepository.save).toHaveBeenCalledWith(createUserDto);
    expect(result).toEqual(mockUser);
  });
});

describe('findByEmail', () => {
  it('should return user by email', async () => {
    const email = 'test@example.com';
    const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', roles: [] } as User;

    jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

    const result = await service.findByEmail(email);

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { email },
      relations: ['roles'],
    });
    expect(result).toEqual(mockUser);
  });
});

describe('findOneBy', () => {
  it('should return user by params', async () => {
    const params = { id: '1' };
    const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', roles: [] } as User;

    jest.spyOn(userRepository, 'findOneOrFail').mockResolvedValue(mockUser);

    const result = await service.findOneBy(params);

    expect(userRepository.findOneOrFail).toHaveBeenCalledWith({
      where: params,
      relations: ['roles'],
    });
    expect(result).toEqual(mockUser);
  });
});

describe('findOne', () => {
  it('should return user by options', async () => {
    const options = { where: { id: 1 } };
    const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' } as User;

    jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

    const result = await service.findOne(options);

    expect(userRepository.findOne).toHaveBeenCalledWith(options);
    expect(result).toEqual(mockUser);
  });
});

describe('update', () => {
  it('should update user', async () => {
    const id = 1;
    const updateUserDto: UpdateUserDto = {
      name: 'Updated User',
      email: 'updated@example.com',
    };

    const mockUpdateResult = { affected: 1 };

    jest.spyOn(userRepository, 'update').mockResolvedValue(mockUpdateResult as any);

    const result = await service.update(id, updateUserDto);

    expect(userRepository.update).toHaveBeenCalledWith(id, updateUserDto);
    expect(result).toEqual(mockUpdateResult);
  });
});

describe('remove', () => {
  it('should remove user', async () => {
    const id = 1;
    const mockDeleteResult = { affected: 1 };

    jest.spyOn(userRepository, 'delete').mockResolvedValue(mockDeleteResult as any);

    const result = await service.remove(id);

    expect(userRepository.delete).toHaveBeenCalledWith(id);
    expect(result).toEqual(mockDeleteResult);
  });
});
 */
