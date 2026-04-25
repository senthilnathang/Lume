import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { PrismaService } from '@core/services/prisma.service';
import { AuthService } from '@core/services/jwt.service';
import { RbacService } from '@core/services/rbac.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, PrismaService, AuthService, RbacService],
  exports: [UsersService],
})
export class UsersModule {}
