import { jest } from '@jest/globals';
import { RbacService } from '@core/services/rbac.service';
import { PrismaService } from '@core/services/prisma.service';

describe('RbacService', () => {
  let service: RbacService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    prismaService = {
      role: { findUnique: jest.fn() },
      rolePermission: { findMany: jest.fn() },
      user: { findUnique: jest.fn() },
      permission: { findUnique: jest.fn() },
    } as any;

    service = new RbacService(prismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should check if user has permission', async () => {
    const mockUser = { id: 1, role_id: 1 };
    const mockRole = { id: 1, name: 'admin' };
    const mockPermissions = [{ permission_id: 1 }, { permission_id: 2 }];

    (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prismaService.role.findUnique as jest.Mock).mockResolvedValue(mockRole);
    (prismaService.rolePermission.findMany as jest.Mock).mockResolvedValue(mockPermissions);

    const hasPermission = await service.hasPermission(1, 'create_user');
    expect(hasPermission).toBe(true);
  });

  it('should deny permission for non-admin on restricted action', async () => {
    const mockUser = { id: 2, role_id: 2 };
    const mockRole = { id: 2, name: 'user' };

    (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prismaService.role.findUnique as jest.Mock).mockResolvedValue(mockRole);
    (prismaService.rolePermission.findMany as jest.Mock).mockResolvedValue([]);

    const hasPermission = await service.hasPermission(2, 'delete_user');
    expect(hasPermission).toBe(false);
  });

  it('should identify admin roles', () => {
    expect(service.isAdminRole('admin')).toBe(true);
    expect(service.isAdminRole('super_admin')).toBe(true);
    expect(service.isAdminRole('user')).toBe(false);
  });

  it('should get role permissions', async () => {
    const mockRolePermissions = [
      { permission: { name: 'create_user' } },
      { permission: { name: 'delete_user' } },
    ] as any;

    (prismaService.rolePermission.findMany as jest.Mock).mockResolvedValue(mockRolePermissions);

    const permissions = await service.getRolePermissions(1);
    expect(permissions).toEqual(['create_user', 'delete_user']);
  });

  it('should return empty array when role has no permissions', async () => {
    (prismaService.rolePermission.findMany as jest.Mock).mockResolvedValue([]);

    const permissions = await service.getRolePermissions(1);
    expect(permissions).toEqual([]);
  });
});
