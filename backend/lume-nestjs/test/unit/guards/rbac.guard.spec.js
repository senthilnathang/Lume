"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const common_1 = require("@nestjs/common");
const rbac_guard_1 = require("../../../src/core/guards/rbac.guard");
describe('RbacGuard', () => {
    let guard;
    let rbacService;
    beforeEach(() => {
        rbacService = {
            hasPermission: globals_1.jest.fn(),
            isAdminRole: globals_1.jest.fn(),
        };
        guard = new rbac_guard_1.RbacGuard(rbacService);
    });
    it('should be defined', () => {
        expect(guard).toBeDefined();
    });
    it('should allow admin users', async () => {
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({
                    user: { id: 1, role_id: 1, role: { name: 'admin' } },
                }),
            }),
            getHandler: () => ({ __permissions__: ['create_user'] }),
        };
        rbacService.isAdminRole.mockReturnValue(true);
        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);
    });
    it('should deny users without required permission', async () => {
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({
                    user: { id: 2, role_id: 2, role: { name: 'user' } },
                }),
            }),
            getHandler: () => ({ __permissions__: ['delete_user'] }),
        };
        rbacService.isAdminRole.mockReturnValue(false);
        rbacService.hasPermission.mockResolvedValue(false);
        try {
            await guard.canActivate(mockContext);
            expect(true).toBe(false); // Should have thrown
        }
        catch (error) {
            expect(error instanceof common_1.ForbiddenException).toBe(true);
            const response = error.getResponse();
            expect(response.message).toContain('Missing permission');
        }
    });
    it('should allow requests with no permission requirements', async () => {
        const mockContext = {
            switchToHttp: () => ({
                getRequest: () => ({
                    user: { id: 2, role_id: 2, role: { name: 'user' } },
                }),
            }),
            getHandler: () => ({ __permissions__: [] }),
        };
        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);
    });
});
//# sourceMappingURL=rbac.guard.spec.js.map