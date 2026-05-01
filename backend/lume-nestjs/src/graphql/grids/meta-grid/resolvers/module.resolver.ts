import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { GqlJwtGuard, GqlRbacGuard } from '../../guards/index.js';
import { GqlCurrentUser } from '../../decorators/index.js';
import { Permissions } from '../../decorators/index.js';
import { JwtPayload } from '../../../auth/jwt.payload.js';
import { InstalledModuleType } from '../types/installed-module.type.js';
import { UpdateModuleConfigInput } from '../inputs/update-module-config.input.js';

@Resolver(() => InstalledModuleType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class ModuleResolver {
  @Query(() => [InstalledModuleType])
  @Permissions('base.modules.manage')
  async installedModules(@GqlCurrentUser() user?: JwtPayload) {
    if (!user) throw new ForbiddenException('Authentication required');
    // TODO: Implement module service call
    return [];
  }

  @Query(() => InstalledModuleType, { nullable: true })
  @Permissions('base.modules.manage')
  async installedModule(
    @Args('name') name: string,
    @GqlCurrentUser() user?: JwtPayload,
  ) {
    if (!user) throw new ForbiddenException('Authentication required');
    // TODO: Implement module service call
    return null;
  }

  @Mutation(() => InstalledModuleType)
  @Permissions('base.modules.manage')
  async updateModuleConfig(
    @Args('input') input: UpdateModuleConfigInput,
    @GqlCurrentUser() user?: JwtPayload,
  ) {
    if (!user) throw new ForbiddenException('Authentication required');
    // TODO: Implement module service call
    return null;
  }

  @Mutation(() => Boolean)
  @Permissions('base.modules.manage')
  async installModule(
    @Args('name') name: string,
    @GqlCurrentUser() user?: JwtPayload,
  ) {
    if (!user) throw new ForbiddenException('Authentication required');
    // TODO: Implement module service call
    return true;
  }

  @Mutation(() => Boolean)
  @Permissions('base.modules.manage')
  async uninstallModule(
    @Args('name') name: string,
    @GqlCurrentUser() user?: JwtPayload,
  ) {
    if (!user) throw new ForbiddenException('Authentication required');
    // TODO: Implement module service call
    return true;
  }
}
