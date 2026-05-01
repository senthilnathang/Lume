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

    if (!req) {
      return null;
    }

    // Try header first
    const headerCompanyId = req.headers?.['x-org-id'];
    if (headerCompanyId) {
      return Number(headerCompanyId);
    }

    // Fallback to JWT claim
    if (req.user?.company_id) {
      return req.user.company_id;
    }

    return null;
  },
);
