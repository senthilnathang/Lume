import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlJwtGuard, GqlRbacGuard } from '../../../guards/index.js';
import { SystemSettingType } from '../types/system-setting.type.js';
import { UpsertSettingInput } from '../inputs/upsert-setting.input.js';
import { SettingsService } from '@modules/settings/services/settings.service';
import { Permissions } from '../../../decorators/index.js';

@Resolver(() => SystemSettingType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class SystemSettingResolver {
  constructor(private settings: SettingsService) {}
  @Query(() => [SystemSettingType])
  @Permissions('settings.read')
  async systemSettings(@Args('group', { nullable: true }) group?: string) {
    return this.settings.records(group);
  }

  @Query(() => SystemSettingType, { nullable: true })
  @Permissions('settings.read')
  async systemSetting(@Args('key') key: string) {
    return this.settings.record(key);
  }

  @Mutation(() => SystemSettingType)
  @Permissions('settings.write')
  async upsertSystemSetting(@Args('input') input: UpsertSettingInput) {
    return (await this.settings.upsertRecords([input]))[0];
  }

  @Mutation(() => [SystemSettingType])
  @Permissions('settings.write')
  async bulkUpsertSettings(
    @Args('inputs', { type: () => [UpsertSettingInput] }) inputs: UpsertSettingInput[],
  ) {
    return this.settings.upsertRecords(inputs);
  }
}
