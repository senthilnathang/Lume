"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const rbac_service_1 = require("../../../src/core/services/rbac.service");
describe('RbacService', () => {
    let service;
    let prismaService;
    beforeEach(async () => {
        prismaService = {
            role: { findUnique: globals_1.jest.fn() },
            rolePermission: { findMany: globals_1.jest.fn() },
            user: { findUnique: globals_1.jest.fn() },
            permission: { findUnique: globals_1.jest.fn() },
        };
        service = new rbac_service_1.RbacService(prismaService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should check if user has permission', async () => {
        const mockUser = { id: 1, role_id: 1 };
        const mockRole = { id: 1, name: 'admin' };
        const mockPermissions = [{ permission_id: 1 }, { permission_id: 2 }];
        prismaService.user.findUnique.mockResolvedValue(mockUser);
        prismaService.role.findUnique.mockResolvedValue(mockRole);
        prismaService.rolePermission.findMany.mockResolvedValue(mockPermissions);
        const hasPermission = await service.hasPermission(1, 'create_user');
        expect(hasPermission).toBe(true);
    });
    it('should deny permission for non-admin on restricted action', async () => {
        const mockUser = { id: 2, role_id: 2 };
        const mockRole = { id: 2, name: 'user' };
        prismaService.user.findUnique.mockResolvedValue(mockUser);
        prismaService.role.findUnique.mockResolvedValue(mockRole);
        prismaService.rolePermission.findMany.mockResolvedValue([]);
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
            { permission: { code: 'create_user' } },
            { permission: { code: 'delete_user' } },
        ];
        prismaService.rolePermission.findMany.mockResolvedValue(mockRolePermissions);
        const permissions = await service.getRolePermissions(1);
        expect(permissions).toEqual(['create_user', 'delete_user']);
    });
    it('should return empty array when role has no permissions', async () => {
        prismaService.rolePermission.findMany.mockResolvedValue([]);
        const permissions = await service.getRolePermissions(1);
        expect(permissions).toEqual([]);
    });
});
//# sourceMappingURL=rbac.service.spec.js.map