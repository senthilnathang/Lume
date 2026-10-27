import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { GqlJwtGuard, GqlRbacGuard } from '../../../guards/index.js';
import { GqlCurrentUser } from '../../../decorators/index.js';
import { Permissions } from '../../../decorators/index.js';
import type { JwtPayload } from '../../../graphql.context';
import { InstalledModuleType } from '../types/installed-module.type.js';
import { UpdateModuleConfigInput } from '../inputs/update-module-config.input.js';
import { ModuleCatalogService } from '@core/module/module-catalog.service';

@Resolver(() => InstalledModuleType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class ModuleResolver {
  constructor(private catalog: ModuleCatalogService) {}
  @Query(() => [InstalledModuleType])
  @Permissions('base.modules.manage')
  async installedModules(@GqlCurrentUser() user?: JwtPayload) {
    if (!user) throw new ForbiddenException('Authentication required');
    return this.catalog.list();
  }

  @Query(() => InstalledModuleType, { nullable: true })
  @Permissions('base.modules.manage')
  async installedModule(
    @Args('name') name: string,
    @GqlCurrentUser() user?: JwtPayload,
  ) {
    if (!user) throw new ForbiddenException('Authentication required');
    return this.catalog.find(name);
  }

  @Mutation(() => InstalledModuleType)
  @Permissions('base.modules.manage')
  async updateModuleConfig(
    @Args('input') input: UpdateModuleConfigInput,
    @GqlCurrentUser() user?: JwtPayload,
  ) {
    if (!user) throw new ForbiddenException('Authentication required');
    return this.catalog.updateConfig(input.moduleName, input.config, input.expectedRevision);
  }

  @Mutation(() => InstalledModuleType)
  @Permissions('base.modules.manage')
  async reloadModule(@Args('name') name: string, @GqlCurrentUser() user?: JwtPayload) {
    if (!user) throw new ForbiddenException('Authentication required');
    return this.catalog.reload(name);
  }

  @Mutation(() => Boolean)
  @Permissions('base.modules.manage')
  async installModule(
    @Args('name') name: string,
    @GqlCurrentUser() user?: JwtPayload,
  ) {
    if (!user) throw new ForbiddenException('Authentication required');
    return this.catalog.install(name);
  }

  @Mutation(() => Boolean)
  @Permissions('base.modules.manage')
  async uninstallModule(
    @Args('name') name: string,
    @GqlCurrentUser() user?: JwtPayload,
  ) {
    if (!user) throw new ForbiddenException('Authentication required');
    return this.catalog.uninstall(name);
  }
}
