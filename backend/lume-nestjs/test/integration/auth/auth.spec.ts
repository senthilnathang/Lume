import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../src/modules/auth/controllers/auth.controller';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { PrismaService } from '../../../src/core/services/prisma.service';
import { AuthService as JwtAuthService } from '../../../src/core/services/jwt.service';
import { LoginDto } from '../../../src/modules/auth/dtos/login.dto';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthModule', () => {
  let controller: AuthController;
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtAuthService: JwtAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: JwtAuthService,
          useValue: {
            comparePassword: jest.fn(),
            generateAccessToken: jest.fn().mockReturnValue('access-token'),
            generateRefreshToken: jest.fn().mockReturnValue('refresh-token'),
            verifyToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtAuthService = module.get<JwtAuthService>(JwtAuthService);
  });

  describe('login', () => {
    it('should return tokens on successful login', async () => {
      const loginDto: LoginDto = { email: 'test@lume.dev', password: 'password123' };
      const mockUser = {
        id: 1,
        email: 'test@lume.dev',
        password: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        role_id: 1,
        role: { id: 1, name: 'admin' },
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(jwtAuthService, 'comparePassword').mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBeDefined();
      expect(result.data.refreshToken).toBeDefined();
      expect(result.data.user.email).toBe('test@lume.dev');
      expect(result.data.user.role).toBe('admin');
    });

    it('should throw on user not found', async () => {
      const loginDto: LoginDto = { email: 'notfound@lume.dev', password: 'password123' };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on wrong password', async () => {
      const loginDto: LoginDto = { email: 'test@lume.dev', password: 'wrong' };
      const mockUser = {
        id: 1,
        email: 'test@lume.dev',
        password: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        role_id: 1,
        role: { id: 1, name: 'admin' },
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(jwtAuthService, 'comparePassword').mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should include role information in response', async () => {
      const loginDto: LoginDto = { email: 'user@lume.dev', password: 'password123' };
      const mockUser = {
        id: 2,
        email: 'user@lume.dev',
        password: 'hashed',
        firstName: 'Regular',
        lastName: 'User',
        role_id: 2,
        role: { id: 2, name: 'user' },
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(jwtAuthService, 'comparePassword').mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result.data.user.role).toBe('user');
    });
  });

  describe('refresh', () => {
    it('should return new access token on valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: 1, email: 'test@lume.dev' };
      const mockUser = {
        id: 1,
        email: 'test@lume.dev',
        role_id: 1,
        role: { id: 1, name: 'admin' },
      };

      jest.spyOn(jwtAuthService, 'verifyToken').mockReturnValue(payload as any);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await service.refresh(refreshToken);

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBeDefined();
      expect(result.data.accessToken).toBe('access-token');
    });

    it('should throw on invalid refresh token', async () => {
      jest.spyOn(jwtAuthService, 'verifyToken').mockReturnValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on user not found during refresh', async () => {
      const payload = { sub: 999, email: 'notfound@lume.dev' };

      jest.spyOn(jwtAuthService, 'verifyToken').mockReturnValue(payload as any);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(service.refresh('token')).rejects.toThrow();
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: 1,
        email: 'test@lume.dev',
        firstName: 'Test',
        lastName: 'User',
        role_id: 1,
        role: { id: 1, name: 'admin' },
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await service.getProfile(1);

      expect(result.success).toBe(true);
      expect(result.data.email).toBe('test@lume.dev');
      expect(result.data.name).toBe('Test User');
      expect(result.data.role).toBe('admin');
    });

    it('should throw on user not found', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(service.getProfile(999)).rejects.toThrow(UnauthorizedException);
    });

    it('should return profile with correct structure', async () => {
      const mockUser = {
        id: 2,
        email: 'user@lume.dev',
        firstName: 'Regular',
        lastName: 'User',
        role_id: 2,
        role: { id: 2, name: 'user' },
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await service.getProfile(2);

      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('email');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('role');
    });
  });

  describe('logout', () => {
    it('should return logout message', async () => {
      const result = await controller.logout({});

      expect(result.message).toBe('Logout successful');
    });
  });

  describe('Controller Integration', () => {
    it('login endpoint should call service.login', async () => {
      const loginDto: LoginDto = { email: 'test@lume.dev', password: 'password123' };
      const mockUser = {
        id: 1,
        email: 'test@lume.dev',
        password: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        role_id: 1,
        role: { id: 1, name: 'admin' },
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(jwtAuthService, 'comparePassword').mockResolvedValue(true);
      const loginSpy = jest.spyOn(service, 'login');

      await controller.login(loginDto);

      expect(loginSpy).toHaveBeenCalledWith(loginDto);
    });

    it('refresh endpoint should call service.refresh', async () => {
      const refreshToken = 'valid-token';
      const payload = { sub: 1, email: 'test@lume.dev' };
      const mockUser = {
        id: 1,
        email: 'test@lume.dev',
        role_id: 1,
        role: { id: 1, name: 'admin' },
      };

      jest.spyOn(jwtAuthService, 'verifyToken').mockReturnValue(payload as any);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      const refreshSpy = jest.spyOn(service, 'refresh');

      await controller.refresh({ refreshToken });

      expect(refreshSpy).toHaveBeenCalledWith(refreshToken);
    });

    it('getProfile endpoint should call service.getProfile', async () => {
      const mockUser = {
        id: 1,
        email: 'test@lume.dev',
        firstName: 'Test',
        lastName: 'User',
        role_id: 1,
        role: { id: 1, name: 'admin' },
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      const profileSpy = jest.spyOn(service, 'getProfile');

      await service.getProfile(1);

      expect(profileSpy).toHaveBeenCalledWith(1);
    });
  });
});
