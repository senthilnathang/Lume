import { Injectable, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt.guard';

/**
 * GraphQL-aware JWT authentication guard.
 * Extends JwtAuthGuard and overrides getRequest() to handle GraphQL execution context.
 * For HTTP routes, uses the standard switchToHttp() flow.
 * For GraphQL resolvers, extracts the req from GqlExecutionContext.
 */
@Injectable()
export class GqlJwtGuard extends JwtAuthGuard {
  override getRequest(context: ExecutionContext) {
    const gqlContext = GqlExecutionContext.create(context);
    // gqlContext.getContext() returns the object from the context factory
    // which includes { req } with req.user set by passport middleware
    return gqlContext.getContext().req;
  }
}
