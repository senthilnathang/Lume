import { resolveTenant } from '../tenant';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * Extracts the tenant company ID from GraphQL context
 * Reads from x-org-id header or JWT claim (company_id)
 * Usage: @GqlTenant() companyId: number
 */
export const GqlTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number | null => {
    const gqlContext = GqlExecutionContext.create(ctx);
    const { req } = gqlContext.getContext<{ req: any }>();

    return resolveTenant(req);
  },
);
