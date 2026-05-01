import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/services/prisma.service';
import { DrizzleService } from '../core/services/drizzle.service';

export interface JwtPayload {
  sub: number;
  email: string;
  role_id: number;
  role_name: string;
  company_id?: number;
  iat?: number;
  exp?: number;
}

export interface GqlContext {
  req: Request;
  user: JwtPayload | null;
  companyId: number | null;
  // DataLoaders will be added in Phase 3
}

@Injectable()
export class GraphQLContextFactory {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly drizzleService: DrizzleService,
  ) {}

  createContext({ req }: { req: Request }): GqlContext {
    const user = (req.user as JwtPayload) || null;

    // Extract tenant ID from header or JWT claim
    const companyId =
      Number(req.headers['x-org-id']) ||
      user?.company_id ||
      null;

    return {
      req,
      user,
      companyId,
      // DataLoaderRegistry will be instantiated here in Phase 3
    };
  }
}
