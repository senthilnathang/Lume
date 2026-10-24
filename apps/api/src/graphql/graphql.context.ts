import { JwtService } from '@nestjs/jwt';
import { resolveTenant } from './tenant';
import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/services/prisma.service';
import { DrizzleService } from '../core/services/drizzle.service';
import { DataLoaderRegistry } from './dataloader/dataloader.registry';

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
      get user() { return req.user || null; },
      get companyId() { return req.user ? resolveTenant(req) : null; },
      get loaders() { return loaders ||= new DataLoaderRegistry(prisma, drizzle, req.user ? resolveTenant(req) : null); },
    };
  }
}
