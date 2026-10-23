import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { GqlJwtGuard } from './gql-jwt.guard';
import { GqlRbacGuard } from './gql-rbac.guard';

/**
 * Provides GraphQL-aware security guards.
 * Export these and use with @UseGuards(GqlJwtGuard, GqlRbacGuard) on resolvers.
 */
@Module({
  imports: [SharedModule],
  providers: [GqlJwtGuard, GqlRbacGuard],
  exports: [GqlJwtGuard, GqlRbacGuard],
})
export class GraphQLGuardsModule {}
