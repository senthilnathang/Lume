import { SetMetadata } from '@nestjs/common';

export const COMPLEXITY_KEY = '__complexity__';

/**
 * Sets query complexity cost on a GraphQL field
 * Usage: @Complexity(5)
 * Used by ComplexityPlugin (Phase 8) to enforce query cost limits
 * Helps prevent DoS attacks via expensive queries
 */
export const Complexity = (cost: number) =>
  SetMetadata(COMPLEXITY_KEY, cost);
