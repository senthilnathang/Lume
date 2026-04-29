import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = '__permissions__';

/**
 * Sets permissions metadata on a route handler
 * Usage: @Permissions('resource.read', 'resource.write')
 * Used by RbacGuard to check access
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
