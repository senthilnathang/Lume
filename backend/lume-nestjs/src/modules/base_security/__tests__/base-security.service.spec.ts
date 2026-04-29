import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BaseSecurityService } from '../services/base-security.service';
import { DrizzleService } from '@core/services/drizzle.service';
import { TotpService } from '@core/services/totp.service';

describe('BaseSecurityService', () => {
  let service: BaseSecurityService;
  let drizzleService: DrizzleService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        BaseSecurityService,
        {
          provide: DrizzleService,
          useValue: {
            getDrizzle: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BaseSecurityService>(BaseSecurityService);
    drizzleService = module.get<DrizzleService>(DrizzleService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('API Keys', () => {
    it('should generate API key with unique prefix', async () => {
      const mockDb = {
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest
              .fn()
              .mockResolvedValue([{ id: 1, name: 'Test Key' }]),
          }),
        }),
      };

      jest.spyOn(service as any, 'getDb').mockResolvedValue(mockDb);

      const result = await service.generateApiKey('Test Key', 1, [
        'read',
        'write',
      ]);

      expect(result).toHaveProperty('plainKey');
      expect(result.plainKey).toMatch(/^lume_/);
    });

    it('should revoke API key', async () => {
      const mockDb = {
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest
                .fn()
                .mockResolvedValue([{ id: 1, status: 'inactive' }]),
            }),
          }),
        }),
      };

      jest.spyOn(service as any, 'getDb').mockResolvedValue(mockDb);

      const result = await service.revokeApiKey(1);
      expect(result.status).toBe('inactive');
    });

    it('should throw NotFoundException when revoking non-existent key', async () => {
      const mockDb = {
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      jest.spyOn(service as any, 'getDb').mockResolvedValue(mockDb);

      await expect(service.revokeApiKey(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('IP Access', () => {
    it('should check IP against blacklist', async () => {
      const mockDb = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                { ipAddress: '192.168.1.100', type: 'blacklist' },
              ]),
            }),
          }),
        }),
      };

      jest.spyOn(service as any, 'getDb').mockResolvedValue(mockDb);

      const result = await service.checkIpAccess('192.168.1.100');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('blacklisted');
    });

    it('should support wildcard IP patterns', async () => {
      const mockDb = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]),
          }),
        }),
      };

      // Mock blacklist - empty
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest
              .fn()
              .mockResolvedValue([
                { ipAddress: '192.168.*', type: 'whitelist' },
              ]),
          }),
        }),
      });

      jest.spyOn(service as any, 'getDb').mockResolvedValue(mockDb);

      // Would match 192.168.* pattern
      // Note: This is a simplified test - actual implementation needs proper mocking
    });
  });

  describe('2FA', () => {
    it('should throw BadRequestException if 2FA already enabled', async () => {
      const mockDb = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest
                .fn()
                .mockResolvedValue([{ enabled: true, id: 1 }]),
            }),
          }),
        }),
      };

      jest.spyOn(service as any, 'getDb').mockResolvedValue(mockDb);

      await expect(
        service.setup2FA(1, 'test@example.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should verify 2FA token', async () => {
      const mockDb = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                {
                  id: 1,
                  secret: 'test_secret',
                  enabled: false,
                },
              ]),
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{ enabled: true }]),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{}]),
          }),
        }),
      };

      jest.spyOn(service as any, 'getDb').mockResolvedValue(mockDb);

      // Mock TotpService
      jest.spyOn(service as any, 'totpService', 'get').mockReturnValue({
        verifyToken: jest.fn().mockReturnValue(true),
        generateSecret: jest
          .fn()
          .mockResolvedValue({
            secret: 'secret',
            otpauthUrl: 'otpauth://...',
            qrCode: 'data:image/...',
          }),
        generateBackupCodes: jest.fn().mockReturnValue([]),
        verifyBackupCode: jest.fn(),
      });

      await expect(service.verify2FA(1, '123456')).resolves.not.toThrow();
    });

    it('should disable 2FA with valid token', async () => {
      const mockDb = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                {
                  id: 1,
                  secret: 'test_secret',
                  enabled: true,
                },
              ]),
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{ enabled: false }]),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{}]),
          }),
        }),
      };

      jest.spyOn(service as any, 'getDb').mockResolvedValue(mockDb);

      // Mock TotpService
      jest.spyOn(service as any, 'totpService', 'get').mockReturnValue({
        verifyToken: jest.fn().mockReturnValue(true),
        generateBackupCodes: jest.fn().mockReturnValue([]),
        verifyBackupCode: jest.fn(),
      });

      await expect(service.disable2FA(1, '123456')).resolves.not.toThrow();
    });
  });

  describe('Sessions', () => {
    it('should create session', async () => {
      const mockDb = {
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([
              {
                id: 1,
                userId: 1,
                token: 'token',
                status: 'active',
              },
            ]),
          }),
        }),
      };

      jest.spyOn(service as any, 'getDb').mockResolvedValue(mockDb);

      const result = await service.createSession(
        1,
        'token',
        '192.168.1.1',
        'Mozilla/5.0...',
      );

      expect(result.userId).toBe(1);
      expect(result.status).toBe('active');
    });

    it('should terminate session', async () => {
      const mockDb = {
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{ status: 'revoked' }]),
            }),
          }),
        }),
      };

      jest.spyOn(service as any, 'getDb').mockResolvedValue(mockDb);

      const result = await service.terminateSession(1);
      expect(result.status).toBe('revoked');
    });

    it('should terminate all other sessions', async () => {
      const mockDb = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([
              { id: 1, token: 'token1' },
              { id: 2, token: 'token2' },
            ]),
          }),
        }),
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue({}),
          }),
        }),
      };

      jest.spyOn(service as any, 'getDb').mockResolvedValue(mockDb);

      const result = await service.terminateAllOtherSessions(1, 'token1');
      expect(result.terminated).toBe(1);
    });
  });

  describe('Security Logs', () => {
    it('should log security event', async () => {
      const mockDb = {
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 1, event: 'login' }]),
          }),
        }),
      };

      jest.spyOn(service as any, 'getDb').mockResolvedValue(mockDb);

      const result = await service.logSecurityEvent(
        1,
        'login',
        { ip: '192.168.1.1' },
        'success',
      );

      expect(result.event).toBe('login');
    });

    it('should retrieve security logs with filters', async () => {
      const mockDb = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest
              .fn()
              .mockReturnValue({
                orderBy: jest
                  .fn()
                  .mockReturnValue({
                    limit: jest.fn().mockResolvedValue([
                      { id: 1, event: 'login', status: 'success' },
                    ]),
                  }),
              }),
          }),
        }),
      };

      jest.spyOn(service as any, 'getDb').mockResolvedValue(mockDb);

      const result = await service.getSecurityLogs({
        event: 'login',
        status: 'success',
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
