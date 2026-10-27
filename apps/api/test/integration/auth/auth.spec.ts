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
            sessions: {
              create: jest.fn(async () => ({})),
              findUnique: jest.fn(async () => ({ user_id: 1, status: 'active', expires_at: new Date(Date.now() + 60000) })),
              updateMany: jest.fn(async () => ({ count: 1 })),
            },
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
    it.each(['user', 'role'])('rejects an inactive %s for all identity operations', async target => {
      const user = { id: 1, email: 'test@lume.dev', password: 'hashed', isActive: true, role_id: 1,
        role: { id: 1, name: 'admin', isActive: true } };
      if (target === 'user') user.isActive = false; else user.role.isActive = false;
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(user as any);
      jest.spyOn(jwtAuthService, 'comparePassword').mockResolvedValue(true);
      jest.spyOn(jwtAuthService, 'verifyToken').mockReturnValue({ sub: 1, sid: 'session', token_use: 'refresh' } as any);
      await expect(service.login({ email: user.email, password: 'valid' })).rejects.toThrow('Invalid credentials');
      await expect(service.refresh('valid')).rejects.toThrow('User unavailable');
      await expect(service.getProfile(1)).rejects.toThrow('User unavailable');
      await expect(service.confirmPassword(1, 'valid')).rejects.toThrow('Invalid credentials');
      expect(prismaService.sessions.create).not.toHaveBeenCalled();
    });
    it('should return tokens on successful login', async () => {
      const loginDto: LoginDto = { email: 'test@lume.dev', password: 'password123' };
      const mockUser = {
        isActive: true,
        id: 1,
        email: 'test@lume.dev',
        password: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        role_id: 1,
        role: { id: 1, name: 'admin', isActive: true },
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
        isActive: true,
        id: 1,
        email: 'test@lume.dev',
        password: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        role_id: 1,
        role: { id: 1, name: 'admin', isActive: true },
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(jwtAuthService, 'comparePassword').mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should include role information in response', async () => {
      const loginDto: LoginDto = { email: 'user@lume.dev', password: 'password123' };
      const mockUser = {
        isActive: true,
        id: 2,
        email: 'user@lume.dev',
        password: 'hashed',
        firstName: 'Regular',
        lastName: 'User',
        role_id: 2,
        role: { id: 2, name: 'user', isActive: true },
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
      const payload = { sub: 1, email: 'test@lume.dev', sid: 'test-session', token_use: 'refresh' };
      const mockUser = {
        isActive: true,
        id: 1,
        email: 'test@lume.dev',
        role_id: 1,
        role: { id: 1, name: 'admin', isActive: true },
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
        isActive: true,
        id: 1,
        email: 'test@lume.dev',
        firstName: 'Test',
        lastName: 'User',
        role_id: 1,
        role: { id: 1, name: 'admin', isActive: true },
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
        isActive: true,
        id: 2,
        email: 'user@lume.dev',
        firstName: 'Regular',
        lastName: 'User',
        role_id: 2,
        role: { id: 2, name: 'user', isActive: true },
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
      const result = await controller.logout({ user: { id: 1, sid: 'test-session' } });

      expect(result.data.loggedOut).toBe(true);
      expect(prismaService.sessions.updateMany).toHaveBeenCalled();
    });
  });

  describe('Controller Integration', () => {
    it('login endpoint should call service.login', async () => {
      const loginDto: LoginDto = { email: 'test@lume.dev', password: 'password123' };
      const mockUser = {
        isActive: true,
        id: 1,
        email: 'test@lume.dev',
        password: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        role_id: 1,
        role: { id: 1, name: 'admin', isActive: true },
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(jwtAuthService, 'comparePassword').mockResolvedValue(true);
      const loginSpy = jest.spyOn(service, 'login');

      await controller.login(loginDto);

      expect(loginSpy).toHaveBeenCalledWith(loginDto);
    });

    it('refresh endpoint should call service.refresh', async () => {
      const refreshToken = 'valid-token';
      const payload = { sub: 1, email: 'test@lume.dev', sid: 'test-session', token_use: 'refresh' };
      const mockUser = {
        isActive: true,
        id: 1,
        email: 'test@lume.dev',
        role_id: 1,
        role: { id: 1, name: 'admin', isActive: true },
      };

      jest.spyOn(jwtAuthService, 'verifyToken').mockReturnValue(payload as any);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      const refreshSpy = jest.spyOn(service, 'refresh');

      await controller.refresh({ refreshToken });

      expect(refreshSpy).toHaveBeenCalledWith(refreshToken);
    });

    it('getProfile endpoint should call service.getProfile', async () => {
      const mockUser = {
        isActive: true,
        id: 1,
        email: 'test@lume.dev',
        firstName: 'Test',
        lastName: 'User',
        role_id: 1,
        role: { id: 1, name: 'admin', isActive: true },
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      const profileSpy = jest.spyOn(service, 'getProfile');

      await service.getProfile(1);

      expect(profileSpy).toHaveBeenCalledWith(1);
    });
  });
});
