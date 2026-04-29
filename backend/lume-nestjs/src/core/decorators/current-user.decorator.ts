import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the current user from the request
 * Usage: @CurrentUser() user
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
