import { Module } from '@nestjs/common';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { PrismaService } from '@core/services/prisma.service';
import { AuthService } from '@core/services/jwt.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, AuthService],
  exports: [UsersService],
})
export class UsersModule {}
