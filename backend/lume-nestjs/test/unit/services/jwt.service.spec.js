"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const jwt_service_1 = require("../../../src/core/services/jwt.service");
describe('AuthService (JWT)', () => {
    let service;
    let mockJwtService;
    beforeEach(() => {
        mockJwtService = {
            sign: globals_1.jest.fn(),
            verify: globals_1.jest.fn(),
        };
        service = new jwt_service_1.AuthService(mockJwtService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should generate access token', async () => {
        const payload = { sub: 1, email: 'admin@lume.dev' };
        mockJwtService.sign.mockReturnValue('token123');
        const token = service.generateAccessToken(payload);
        expect(token).toBe('token123');
        expect(mockJwtService.sign).toHaveBeenCalledWith(payload, expect.any(Object));
    });
    it('should hash password with bcrypt', async () => {
        const password = 'password123';
        const hash = await service.hashPassword(password);
        expect(hash).not.toBe(password);
        expect(hash.length).toBeGreaterThan(0);
    });
    it('should compare password with hash', async () => {
        const password = 'password123';
        const hash = await service.hashPassword(password);
        const matches = await service.comparePassword(password, hash);
        expect(matches).toBe(true);
    });
    it('should verify token', () => {
        const payload = { sub: 1 };
        mockJwtService.verify.mockReturnValue(payload);
        const result = service.verifyToken('token123');
        expect(result).toEqual(payload);
    });
});
//# sourceMappingURL=jwt.service.spec.js.map