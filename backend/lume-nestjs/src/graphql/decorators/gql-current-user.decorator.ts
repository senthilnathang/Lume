import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtPayload } from '../graphql.context';

/**
 * Extracts the current user from GraphQL context
 * Usage: @GqlCurrentUser() user: JwtPayload
 */
export const GqlCurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload | null => {
    const gqlContext = GqlExecutionContext.create(ctx);
    const { req } = gqlContext.getContext<{ req: any }>();
    return req?.user || null;
  },
);
