import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlJwtGuard, GqlRbacGuard } from '../../guards/index.js';
import { SystemSettingType } from '../types/system-setting.type.js';
import { UpsertSettingInput } from '../inputs/upsert-setting.input.js';

@Resolver(() => SystemSettingType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class SystemSettingResolver {
  @Query(() => [SystemSettingType])
  async systemSettings(@Args('group', { nullable: true }) group?: string) {
    // TODO: Implement system settings service call
    return [];
  }

  @Query(() => SystemSettingType, { nullable: true })
  async systemSetting(@Args('key') key: string) {
    // TODO: Implement system settings service call
    return null;
  }

  @Mutation(() => SystemSettingType)
  async upsertSystemSetting(@Args('input') input: UpsertSettingInput) {
    // TODO: Implement system settings service call
    return {
      key: input.key,
      value: input.value,
      group: input.group,
      label: input.label,
      updatedAt: new Date(),
    };
  }

  @Mutation(() => [SystemSettingType])
  async bulkUpsertSettings(
    @Args('inputs', { type: () => [UpsertSettingInput] }) inputs: UpsertSettingInput[],
  ) {
    // TODO: Implement system settings service call
    return inputs.map((input) => ({
      key: input.key,
      value: input.value,
      group: input.group,
      label: input.label,
      updatedAt: new Date(),
    }));
  }
}
