import { JwtService } from '@nestjs/jwt';
import { resolveTenant } from './tenant';
import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/services/prisma.service';
import { DrizzleService } from '../core/services/drizzle.service';
import { DataLoaderRegistry } from './dataloader/dataloader.registry';
import { tenantAllowsAccess } from '@core/services/tenant-access';
import { tenantClaimMatches } from '@core/services/tenant-membership';

export interface JwtPayload {
  sub: number;
  email: string;
  role_id: number;
  role_name: string;
  company_id?: number;
  iat?: number;
  exp?: number;
}

export type AuthenticatedRequest = Request & { user?: JwtPayload };

export interface GqlContext {
  req: AuthenticatedRequest;
  user: JwtPayload | null;
  companyId: number | null;
  loaders: DataLoaderRegistry;
  canReceiveTenantEvent(companyId: number | null | undefined): Promise<boolean>;
}

@Injectable()
export class GraphQLContextFactory {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly drizzleService: DrizzleService,
  ) {}

  createContext({ req }: { req: AuthenticatedRequest }): GqlContext {
    // Apollo can copy context properties before guards run. Verify the bearer token
    // before resolving tenant-scoped loaders; Passport still guards each operation.
    if (!req.user && typeof req.headers?.authorization === 'string') {
      const [scheme, token] = req.headers.authorization.split(' ');
      if (scheme === 'Bearer' && token) {
        try { req.user = new JwtService({ secret: process.env.JWT_SECRET }).verify<JwtPayload>(token); }
        catch { /* The authentication guard reports invalid credentials. */ }
      }
    }
    let loaders: DataLoaderRegistry;
    const prisma = this.prismaService;
    const drizzle = this.drizzleService;
    return {
      req,
      async canReceiveTenantEvent(companyId) {
        if (!req.user || companyId == null) return false;
        const user = await prisma.user.findUnique({ where: { id: req.user.sub }, include: { role: true } });
        if (!user?.isActive || !user.role?.isActive || !tenantClaimMatches(user.metadata, req.user.company_id)) return false;
        if (companyId !== resolveTenant({ headers: req.headers, user: { ...req.user, role_name: user.role.name } })) return false;
        return tenantAllowsAccess(prisma, companyId);
      },
      get user() { return req.user || null; },
      get companyId() { return req.user ? resolveTenant(req) : null; },
      get loaders() { return loaders ||= new DataLoaderRegistry(prisma, drizzle, req.user ? resolveTenant(req) : null); },
    };
  }
}
