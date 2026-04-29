import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { UsersController } from '../../../src/modules/users/controllers/users.controller';
import { UsersService } from '../../../src/modules/users/services/users.service';
import { PrismaService } from '@core/services/prisma.service';
import { AuthService } from '@core/services/jwt.service';
import { RbacGuard } from '@core/guards/rbac.guard';
import { RbacService } from '@core/services/rbac.service';
import { CreateUserDto } from '../../../src/modules/users/dtos';

// Mock guard for testing
class MockRbacGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    return true;
  }
}

describe('UsersModule', () => {
  let controller: UsersController;
  let service: UsersService;
  let prismaService: PrismaService;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
        {
          provide: AuthService,
          useValue: {
            hashPassword: jest.fn().mockResolvedValue('hashed-password'),
          },
        },
        {
          provide: RbacService,
          useValue: {},
        },
        {
          provide: RbacGuard,
          useClass: MockRbacGuard,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);
  });

  describe('findAll', () => {
    it('should return list of users', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@lume.dev', firstName: 'User', lastName: '1', role_id: 1, role: { name: 'admin' } },
        { id: 2, email: 'user2@lume.dev', firstName: 'User', lastName: '2', role_id: 2, role: { name: 'user' } },
      ];

      jest.spyOn(prismaService.user, 'findMany').mockResolvedValue(mockUsers);

      const result = await controller.findAll();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].email).toBe('user1@lume.dev');
    });

    it('should filter by role', async () => {
      const mockUsers = [
        { id: 1, email: 'admin@lume.dev', firstName: 'Admin', lastName: 'User', role_id: 1, role: { name: 'admin' } },
      ];

      jest.spyOn(prismaService.user, 'findMany').mockResolvedValue(mockUsers);

      const result = await controller.findAll('admin');

      expect(result.success).toBe(true);
      expect(result.data[0].role.name).toBe('admin');
    });

    it('should respect limit parameter', async () => {
      const mockUsers = [];

      jest.spyOn(prismaService.user, 'findMany').mockResolvedValue(mockUsers);

      await controller.findAll(undefined, 10);

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: {},
        include: { role: true },
        take: 10,
      });
    });
  });

  describe('create', () => {
    it('should create new user', async () => {
      const createDto: CreateUserDto = {
        email: 'newuser@lume.dev',
        firstName: 'New',
        lastName: 'User',
        password: 'password123',
        role_id: 2,
      };

      const mockUser = {
        id: 3,
        email: createDto.email,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
        password: 'hashed-password',
        role_id: 2,
        role: { id: 2, name: 'user' },
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'create').mockResolvedValue(mockUser);

      const result = await controller.create(createDto);

      expect(result.success).toBe(true);
      expect(result.data.email).toBe('newuser@lume.dev');
      expect(authService.hashPassword).toHaveBeenCalledWith('password123');
    });

    it('should reject duplicate email', async () => {
      const createDto: CreateUserDto = {
        email: 'existing@lume.dev',
        firstName: 'Existing',
        lastName: 'User',
        password: 'password123',
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({ id: 1, email: 'existing@lume.dev' } as any);

      try {
        await controller.create(createDto);
        expect(true).toBe(false); // Should throw
      } catch (error) {
        expect(error.message).toContain('Email already exists');
      }
    });

    it('should assign default role if not provided', async () => {
      const createDto: CreateUserDto = {
        email: 'newuser@lume.dev',
        firstName: 'New',
        lastName: 'User',
        password: 'password123',
      };

      const mockUser = {
        id: 3,
        email: createDto.email,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
        password: 'hashed-password',
        role_id: 5,
        role: { id: 5, name: 'user' },
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'create').mockResolvedValue(mockUser);

      await controller.create(createDto);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: createDto.email,
          firstName: createDto.firstName,
          lastName: createDto.lastName,
          password: 'hashed-password',
          role_id: 5,
        },
        include: { role: true },
      });
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const mockUser = { id: 1, email: 'user@lume.dev', firstName: 'User', lastName: 'Test', role_id: 2, role: { name: 'user' } };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await controller.findOne(1);

      expect(result.success).toBe(true);
      expect(result.data.email).toBe('user@lume.dev');
    });

    it('should throw on user not found', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      try {
        await controller.findOne(999);
        expect(true).toBe(false); // Should throw
      } catch (error) {
        expect(error.message).toContain('not found');
      }
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const updateDto = { firstName: 'Updated' };
      const mockUser = { id: 1, email: 'user@lume.dev', firstName: 'User', lastName: 'Test', role_id: 2 };
      const mockUpdated = { ...mockUser, firstName: 'Updated', role: { id: 2, name: 'user' } };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(mockUpdated as any);

      const result = await controller.update(1, updateDto);

      expect(result.success).toBe(true);
      expect(result.data.firstName).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      const mockUser = { id: 1, email: 'user@lume.dev', firstName: 'User', lastName: 'Test', role_id: 2 };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.user, 'delete').mockResolvedValue(mockUser as any);

      const result = await controller.remove(1);

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted');
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple users', async () => {
      const dtos: CreateUserDto[] = [
        { email: 'user1@lume.dev', firstName: 'User', lastName: '1', password: 'pass123', role_id: 2 },
        { email: 'user2@lume.dev', firstName: 'User', lastName: '2', password: 'pass123', role_id: 2 },
      ];

      const mockUsers = [
        { id: 1, email: 'user1@lume.dev', firstName: 'User', lastName: '1', role_id: 2, role: { id: 2, name: 'user' } },
        { id: 2, email: 'user2@lume.dev', firstName: 'User', lastName: '2', role_id: 2, role: { id: 2, name: 'user' } },
      ];

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'create').mockResolvedValueOnce(mockUsers[0] as any).mockResolvedValueOnce(mockUsers[1] as any);

      const result = await controller.bulkCreate(dtos);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple users', async () => {
      jest.spyOn(prismaService.user, 'deleteMany').mockResolvedValue({ count: 2 });

      const result = await controller.bulkDelete([1, 2]);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Deleted 2 users');
    });
  });

  describe('getFields', () => {
    it('should return field metadata', async () => {
      const result = await controller.getFields();

      expect(result.success).toBe(true);
      expect(result.data).toContainEqual({ name: 'id', type: 'integer', editable: false });
      expect(result.data).toContainEqual({ name: 'email', type: 'email', editable: true });
      expect(result.data).toContainEqual({ name: 'firstName', type: 'string', editable: true });
      expect(result.data).toContainEqual({ name: 'lastName', type: 'string', editable: true });
    });
  });
});
