import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { REPOSITORY } from '~/common/constants/database';
import { env } from '~/config/env';
import { mockRepository } from '~/test/common/mock';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        UserModule,
        JwtModule.register({
          secret: env.JWT_SECRET,
          privateKey: env.JWT_PRIVATE_KEY,
          publicKey: env.JWT_PUBLIC_KEY,
        }),
      ],
      providers: [
        AuthService,
        UserService,
        {
          provide: REPOSITORY.USER,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(userService).toBeDefined();
    expect(jwtService).toBeDefined();
  });
});

/**
  describe('signUp', () => {
    it('should create a new user successfully', async () => {
      const signUpDto: SignUpDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const mockCreatedUser = { id: '1', name: 'Test User', email: 'test@example.com' };
      const mockUserWithRoles = { id: '1', name: 'Test User', email: 'test@example.com', roles: [] };

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(userService, 'create').mockResolvedValue(mockCreatedUser);
      jest.spyOn(userService, 'findOne').mockResolvedValue(mockUserWithRoles);

      const result = await service.signUp(signUpDto);

      expect(userService.findByEmail).toHaveBeenCalledWith(signUpDto.email);
      expect(userService.create).toHaveBeenCalledWith(signUpDto);
      expect(userService.findOne).toHaveBeenCalledWith({ where: { id: '1' }, relations: ['roles'] });
      expect(result).toEqual(mockUserWithRoles);
    });

    it('should throw BadRequestException if user already exists', async () => {
      const signUpDto: SignUpDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const existingUser = { id: '1', name: 'Test User', email: 'test@example.com' };
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(existingUser as any);

      await expect(service.signUp(signUpDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('signIn', () => {
    it('should sign in user successfully', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);

      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
      };

      const mockPermissions = ['read:users', 'write:users'];

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(userService, 'getFlattenPermissions').mockResolvedValue(mockPermissions as any);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('token' as never);

      const result = await service.signIn(email, password);

      expect(userService.findByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(userService.getFlattenPermissions).toHaveBeenCalledWith(mockUser.id);
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('user');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);

      await expect(service.signIn(email, password)).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';

      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedPassword',
      };

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.signIn(email, password)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token successfully', async () => {
      const refresh_token = 'valid_refresh_token';
      const mockPayload = { email: 'test@example.com', sub: '1' };

      jest.spyOn(jwtService, 'verify').mockReturnValue(mockPayload);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('new_access_token' as never);

      const result = await service.refreshToken(refresh_token);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jwtService.verify).toHaveBeenCalledWith(refresh_token, {
        secret: env.JWT_REFRESH_SECRET,
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jwtService.signAsync).toHaveBeenCalledWith({ email: mockPayload.email, sub: mockPayload.sub }, { expiresIn: '2h' });
      expect(result).toEqual({ access_token: 'new_access_token' });
    });

    it('should throw UnauthorizedException if refresh token is undefined', async () => {
      await expect(service.refreshToken()).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      const refresh_token = 'invalid_refresh_token';

      jest.spyOn(jwtService, 'verify').mockReturnValue({});

      await expect(service.refreshToken(refresh_token)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getFullPermissions', () => {
    it('should return user permissions', async () => {
      const userId = '1';
      const mockPermissions = [
        { id: '1', name: 'read:users' },
        { id: '2', name: 'write:users' },
      ];

      jest.spyOn(userService, 'getFullPermissions').mockResolvedValue(mockPermissions as any);

      const result = await service.getFullPermissions(userId);

      expect(userService.getFullPermissions).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockPermissions);
    });
  });
 */
