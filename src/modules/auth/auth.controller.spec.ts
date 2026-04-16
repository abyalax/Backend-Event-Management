import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { REPOSITORY } from '~/common/constants/database';
import { env } from '~/config/env';
import { mockRepository } from '~/test/common/mock';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        UserModule,
        JwtModule.registerAsync({
          inject: [],
          useFactory: () => {
            return {
              secret: env.JWT_SECRET,
              privateKey: env.JWT_PRIVATE_KEY,
              publicKey: env.JWT_PUBLIC_KEY,
            };
          },
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
      controllers: [AuthController],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(authService).toBeDefined();
  });
});

/**
  describe('signUp', () => {
    it('should create a new user', async () => {
      const signUpDto: SignUpDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
      };

      jest.spyOn(authService, 'signUp').mockResolvedValue(expectedUser as any);

      const result = await controller.signUp(signUpDto);

      expect(authService.signUp).toHaveBeenCalledWith(signUpDto);
      expect(result).toEqual({
        statusCode: 201,
        data: expectedUser,
      });
    });
  });

  describe('signIn', () => {
    it('should sign in user and set cookies', async () => {
      const signInDto: SignInDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedData = {
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      jest.spyOn(authService, 'signIn').mockResolvedValue(expectedData as any);

      const result = await controller.signIn(signInDto, mockResponse as Response);

      expect(authService.signIn).toHaveBeenCalledWith(signInDto.email, signInDto.password);
      expect(mockResponse.cookie).toHaveBeenCalledWith('refresh_token', expectedData.refresh_token, {
        httpOnly: true,
        signed: true,
      });
      expect(mockResponse.cookie).toHaveBeenCalledWith('access_token', expectedData.access_token, {
        httpOnly: true,
        signed: true,
      });
      expect(result).toEqual({
        statusCode: 202,
        data: expectedData.user,
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token', async () => {
      const mockRequest = {
        signedCookies: {
          refresh_token: 'refresh_token',
        },
      };

      const expectedData = {
        access_token: 'new_access_token',
      };

      jest.spyOn(authService, 'refreshToken').mockResolvedValue(expectedData as any);

      await controller.refreshToken(mockRequest as any, mockResponse as Response);

      expect(authService.refreshToken).toHaveBeenCalledWith('refresh_token');
      expect(mockResponse.cookie).toHaveBeenCalledWith('access_token', expectedData.access_token, {
        httpOnly: true,
        signed: true,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 200,
      });
    });
  });

  describe('getFullPermissions', () => {
    it('should return user permissions', async () => {
      const mockRequest = {
        user: {
          id: '1',
        },
      };

      const expectedPermissions = [
        {
          id: '1',
          name: 'read:users',
        },
      ];

      jest.spyOn(authService, 'getFullPermissions').mockResolvedValue(expectedPermissions as any);

      const result = await controller.getFullPermissions(mockRequest as any);

      expect(authService.getFullPermissions).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        statusCode: 200,
        data: expectedPermissions,
      });
    });

    it('should throw UnauthorizedException when user id is not found', async () => {
      const mockRequest = {
        user: {},
      };

      await expect(controller.getFullPermissions(mockRequest as any)).rejects.toThrow('ID User not found');
    });
  });

  describe('signOut', () => {
    it('should clear cookies and return success message', async () => {
      const result = await controller.signOut(mockResponse as Response);

      expect(mockResponse.cookie).toHaveBeenCalledWith('refresh_token', '', {
        httpOnly: true,
        signed: true,
      });
      expect(mockResponse.cookie).toHaveBeenCalledWith('access_token', '', {
        httpOnly: true,
        signed: true,
      });
      expect(result).toEqual({
        statusCode: 202,
        message: 'Successfully logout',
      });
    });
  });
 */
