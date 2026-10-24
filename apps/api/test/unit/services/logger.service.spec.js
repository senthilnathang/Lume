"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const common_1 = require("@nestjs/common");
const testing_1 = require("@nestjs/testing");
const logger_service_1 = require("../../../src/core/services/logger.service");
describe('LoggerService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [logger_service_1.LoggerService],
        }).compile();
        service = module.get(logger_service_1.LoggerService);
    });
    afterEach(() => {
        globals_1.jest.clearAllMocks();
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should log debug messages', () => {
        globals_1.jest.spyOn(common_1.Logger.prototype, 'debug');
        service.debug('test message');
        expect(common_1.Logger.prototype.debug).toHaveBeenCalled();
    });
    it('should log error messages', () => {
        globals_1.jest.spyOn(common_1.Logger.prototype, 'error');
        service.error('error message', 'test context');
        expect(common_1.Logger.prototype.error).toHaveBeenCalled();
    });
    it('should create child logger with context', () => {
        const childLogger = service.getLogger('TestContext');
        expect(childLogger).toBeDefined();
        expect(childLogger).toBeInstanceOf(common_1.Logger);
    });
    it('should log warn messages', () => {
        globals_1.jest.spyOn(common_1.Logger.prototype, 'warn');
        service.warn('warning message', 'test context');
        expect(common_1.Logger.prototype.warn).toHaveBeenCalled();
    });
});
//# sourceMappingURL=logger.service.spec.js.map