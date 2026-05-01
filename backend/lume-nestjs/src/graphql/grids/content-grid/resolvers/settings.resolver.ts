import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlJwtGuard, GqlRbacGuard } from '../../guards/index.js';
import { GqlTenant } from '../../decorators/index.js';
import { WebsiteSettingsType } from '../types/website-settings.type.js';
import { UpdateSettingsInput } from '../inputs/update-settings.input.js';

@Resolver(() => WebsiteSettingsType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class SettingsResolver {
  @Query(() => WebsiteSettingsType)
  async websiteSettings(@GqlTenant() tenantId?: number) {
    // TODO: Implement settings service call
    return {
      siteName: '',
      siteDescription: '',
      seoSettings: {},
      codeInjection: {},
    };
  }

  @Mutation(() => WebsiteSettingsType)
  async updateWebsiteSettings(
    @Args('input') input: UpdateSettingsInput,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement settings service call
    return {
      siteName: input.siteName || '',
      siteDescription: input.siteDescription || '',
      logoUrl: input.logoUrl,
      favicon: input.favicon,
      seoSettings: input.seoSettings || {},
      customCss: input.customCss,
      codeInjection: input.codeInjection || {},
    };
  }
}
