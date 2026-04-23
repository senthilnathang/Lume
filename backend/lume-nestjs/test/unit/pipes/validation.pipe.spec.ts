import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { ValidatePipe } from '@core/pipes/validation.pipe';

describe('ValidationPipe', () => {
  let pipe: ValidatePipe;

  beforeEach(() => {
    pipe = new ValidatePipe();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should pass values for non-body types', async () => {
    const metadata = { type: 'param', data: 'id' };
    const result = await pipe.transform({ id: '123' }, metadata as any);
    expect(result).toEqual({ id: '123' });
  });

  it('should handle custom types', async () => {
    const dto = { email: 'test@example.com', password: 'password123' };
    const metadata = { type: 'custom' };

    const result = await pipe.transform(dto, metadata as any);
    expect(result).toEqual(dto);
  });

  it('should return value when no metatype', async () => {
    const dto = { email: 'test@example.com' };
    const metadata = { type: 'body' };

    const result = await pipe.transform(dto, metadata as any);
    expect(result).toEqual(dto);
  });

  it('should be instantiable', () => {
    expect(pipe).toBeDefined();
  });
});
