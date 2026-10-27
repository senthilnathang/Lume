import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@core/services/prisma.service';
import { sessionKey } from '../services/auth.service';
import { JwtPayloadDto } from '../dtos/jwt-payload.dto';
import { resolveTenant } from '../../../graphql/tenant';
import { tenantAllowsAccess } from '@core/services/tenant-access';
import { tenantClaimMatches } from '@core/services/tenant-membership';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(requestOrPayload: any, requestPayload?: JwtPayloadDto) {
    const payload: JwtPayloadDto = requestPayload ?? requestOrPayload;
    const request = requestPayload ? requestOrPayload : { headers: {} };
    if (payload.token_use === 'refresh') throw new UnauthorizedException('Access token required');
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, include: { role: true } });
    if (!user?.isActive || !user.role?.isActive) throw new UnauthorizedException('User unavailable');
    if (!tenantClaimMatches(user.metadata, payload.company_id)) throw new UnauthorizedException('Tenant membership changed; sign in again');
    if (payload.sid) {
      const session = await this.prisma.sessions.findUnique({ where: { token: sessionKey(payload.sid) } });
      if (!session || session.user_id !== user.id || session.status !== 'active' || session.expires_at <= new Date()) {
        throw new UnauthorizedException('Session expired');
      }
    }
    const identity = {
      id: payload.sub,
      sid: payload.sid,
      sub: payload.sub,
      company_id: payload.company_id,
      email: payload.email,
      role_id: user.role_id,
      role_name: user.role?.name,
    };
    const companyId = resolveTenant({ headers: request.headers, user: identity });
    if (!await tenantAllowsAccess(this.prisma, companyId)) throw new UnauthorizedException('Tenant unavailable');
    return identity;
  }
}
