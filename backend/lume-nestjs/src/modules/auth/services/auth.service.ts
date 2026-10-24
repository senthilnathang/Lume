import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '@core/services/prisma.service';
import { AuthService as JwtAuthService } from '@core/services/jwt.service';
import { LoginDto } from '../dtos/login.dto';

export const sessionKey = (sid: string) => createHash('sha256').update(sid).digest('hex');

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtAuth: JwtAuthService) {}

  private profile(user: any) {
    return { id: user.id, email: user.email, firstName: user.firstName,
      lastName: user.lastName, name: `${user.firstName} ${user.lastName}`.trim(),
      avatar: user.avatar, role: user.role?.name, role_id: user.role_id };
  }

  private claims(user: any, sid: string) {
    // Tenant assignment comes only from trusted server-side user metadata.
    let metadata: any = {};
    try { metadata = JSON.parse(user.metadata || '{}'); } catch {}
    const companyId = Number(metadata.company_id);
    return { sub: user.id, email: user.email, role_id: user.role_id,
      role_name: user.role?.name, sid,
      ...(Number.isSafeInteger(companyId) && companyId > 0 ? { company_id: companyId } : {}) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email }, include: { role: true } });
    if (!user || user.isActive === false || user.role?.isActive === false ||
        (user.lock_until && user.lock_until > new Date()) ||
        !await this.jwtAuth.comparePassword(dto.password, user.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const sid = randomUUID();
    const claims = this.claims(user, sid);
    await this.prisma.sessions.create({ data: { user_id: user.id, token: sessionKey(sid),
      expires_at: new Date(Date.now() + 30 * 86400000), status: 'active' } });
    return { success: true, data: {
      accessToken: this.jwtAuth.generateAccessToken({ ...claims, token_use: 'access' }),
      refreshToken: this.jwtAuth.generateRefreshToken({ sub: user.id, sid, token_use: 'refresh' }),
      user: this.profile(user),
    } };
  }

  async refresh(refreshToken: string) {
    const payload = this.jwtAuth.verifyToken(refreshToken);
    if (!payload || payload.token_use !== 'refresh' || typeof payload.sid !== 'string') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const session = await this.prisma.sessions.findUnique({ where: { token: sessionKey(payload.sid) } });
    if (!session || session.user_id !== payload.sub || session.status !== 'active' || session.expires_at <= new Date()) {
      throw new UnauthorizedException('Session expired');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, include: { role: true } });
    if (!user || user.isActive === false || user.role?.isActive === false) throw new UnauthorizedException('User unavailable');
    return { success: true, data: { accessToken: this.jwtAuth.generateAccessToken({
      ...this.claims(user, payload.sid), token_use: 'access',
    }) } };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!user || user.isActive === false) throw new UnauthorizedException('User unavailable');
    return { success: true, data: this.profile(user) };
  }

  async confirmPassword(userId: number, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !await this.jwtAuth.comparePassword(password, user.password)) {
      throw new ForbiddenException('Invalid credentials');
    }
    return { success: true, data: { confirmed: true } };
  }

  async logout(user: { id: number; sid?: string }) {
    if (user.sid) await this.prisma.sessions.updateMany({
      where: { token: sessionKey(user.sid), user_id: user.id }, data: { status: 'revoked' },
    });
    return { success: true, data: { loggedOut: true } };
  }
}
