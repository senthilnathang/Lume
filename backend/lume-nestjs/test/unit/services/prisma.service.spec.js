"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const prisma_service_1 = require("../../../src/core/services/prisma.service");
describe('PrismaService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [prisma_service_1.PrismaService],
        }).compile();
        service = module.get(prisma_service_1.PrismaService);
    });
    afterEach(async () => {
        await service.$disconnect();
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should have module init hook', async () => {
        expect(service.onModuleInit).toBeDefined();
        expect(typeof service.onModuleInit).toBe('function');
    });
    it('should have module destroy hook', async () => {
        expect(service.onModuleDestroy).toBeDefined();
        expect(typeof service.onModuleDestroy).toBe('function');
    });
    it('should have toCamelCase helper', () => {
        const result = service._toCamelCase({ hello_world: 'test' });
        expect(result.helloWorld).toBe('test');
    });
    it('should handle array conversion to camelCase', () => {
        const result = service._toCamelCase([{ hello_world: 'test' }]);
        expect(Array.isArray(result)).toBe(true);
        expect(result[0].helloWorld).toBe('test');
    });
});
//# sourceMappingURL=prisma.service.spec.js.map