import { jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@core/services/logger.service';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log debug messages', () => {
    jest.spyOn(Logger.prototype, 'debug');
    service.debug('test message');
    expect(Logger.prototype.debug).toHaveBeenCalled();
  });

  it('should log error messages', () => {
    jest.spyOn(Logger.prototype, 'error');
    service.error('error message', 'test context');
    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it('should create child logger with context', () => {
    const childLogger = service.getLogger('TestContext');
    expect(childLogger).toBeDefined();
    expect(childLogger).toBeInstanceOf(Logger);
  });

  it('should log warn messages', () => {
    jest.spyOn(Logger.prototype, 'warn');
    service.warn('warning message', 'test context');
    expect(Logger.prototype.warn).toHaveBeenCalled();
  });
});
