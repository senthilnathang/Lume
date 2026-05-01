import { Module } from '@nestjs/common';
import { ModuleResolver } from './resolvers/module.resolver.js';
import { SystemSettingResolver } from './resolvers/system-setting.resolver.js';
import { SequenceResolver } from './resolvers/sequence.resolver.js';

@Module({
  providers: [ModuleResolver, SystemSettingResolver, SequenceResolver],
  exports: [ModuleResolver, SystemSettingResolver, SequenceResolver],
})
export class MetaGridModule {}
