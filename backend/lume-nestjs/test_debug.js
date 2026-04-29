import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './src/core/services/jwt.service.js';

const mockJwtService = {
  sign: () => 'token123',
  verify: () => ({ sub: 1 }),
};

const module = await Test.createTestingModule({
  providers: [
    AuthService,
    {
      provide: JwtService,
      useValue: mockJwtService,
    },
  ],
}).compile();

const service = module.get(AuthService);
const jwtService = module.get(JwtService);

console.log('Service:', service);
console.log('JwtService:', jwtService);
console.log('Service jwtService:', service.jwtService);

const token = service.generateAccessToken({ sub: 1 });
console.log('Token:', token);
