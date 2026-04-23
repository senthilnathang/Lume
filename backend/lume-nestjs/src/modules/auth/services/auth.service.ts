import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { AuthService as JwtAuthService } from '@core/services/jwt.service';
import { LoginDto } from '../dtos/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtAuth: JwtAuthService,
  ) {}

  async login(dto: LoginDto) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const passwordMatch = await this.jwtAuth.comparePassword(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const accessToken = this.jwtAuth.generateAccessToken({
      sub: user.id,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role?.name,
    });

    const refreshToken = this.jwtAuth.generateRefreshToken({
      sub: user.id,
      email: user.email,
    });

    return {
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role?.name,
        },
      },
    };
  }

  async refresh(refreshToken: string) {
    const payload = this.jwtAuth.verifyToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = this.jwtAuth.generateAccessToken({
      sub: user.id,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role?.name,
    });

    return { success: true, data: { accessToken } };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role?.name,
      },
    };
  }
}
