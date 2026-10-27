import { ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

/** Keep the same limiter/storage for REST, GraphQL HTTP and subscriptions. */
@Injectable()
export class TransportThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    if (context.getType<string>() !== 'graphql') return super.getRequestResponse(context);
    const { req, res } = GqlExecutionContext.create(context).getContext();
    if (!req) throw new ForbiddenException('Request context required');
    return {
      // WebSocket upgrade requests do not have Express's ip/res properties.
      req: req.ip ? req : { ...req, ip: req.socket?.remoteAddress || req.connection?.remoteAddress || '0.0.0.0' },
      res: res || req.res || {},
    };
  }
}
