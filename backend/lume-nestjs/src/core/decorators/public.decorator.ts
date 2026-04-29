import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = '__public__';

/**
 * Marks a route as public (no authentication required)
 * Usage: @Public()
 * Used by JwtAuthGuard to skip authentication
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
