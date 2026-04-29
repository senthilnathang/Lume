import { jest } from '@jest/globals';
import { AuthService } from '@core/services/jwt.service';

describe('AuthService (JWT)', () => {
  let service: AuthService;
  let mockJwtService: any;

  beforeEach(() => {
    mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    service = new AuthService(mockJwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate access token', async () => {
    const payload = { sub: 1, email: 'admin@lume.dev' };
    (mockJwtService.sign as jest.Mock).mockReturnValue('token123');

    const token = service.generateAccessToken(payload);
    expect(token).toBe('token123');
    expect(mockJwtService.sign).toHaveBeenCalledWith(payload);
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
    (mockJwtService.verify as jest.Mock).mockReturnValue(payload);

    const result = service.verifyToken('token123');
    expect(result).toEqual(payload);
  });
});
