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

export interface GqlContext {
  req: Request;
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

  createContext({ req }: { req: Request }): GqlContext {
    const user = (req.user as JwtPayload) || null;

    // Extract tenant ID from header or JWT claim
    const companyId =
      Number(req.headers['x-org-id']) ||
      user?.company_id ||
      null;

    // Create per-request DataLoaders scoped to tenant
    const loaders = new DataLoaderRegistry(
      this.prismaService,
      this.drizzleService,
      companyId,
    );

    return {
      req,
      user,
      companyId,
      loaders,
    };
  }
}
