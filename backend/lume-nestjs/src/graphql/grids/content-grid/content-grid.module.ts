import { Module } from '@nestjs/common';
import { PageResolver } from './resolvers/page.resolver.js';
import { MenuResolver } from './resolvers/menu.resolver.js';
import { MediaResolver } from './resolvers/media.resolver.js';
import { SettingsResolver } from './resolvers/settings.resolver.js';

@Module({
  providers: [PageResolver, MenuResolver, MediaResolver, SettingsResolver],
  exports: [PageResolver, MenuResolver, MediaResolver, SettingsResolver],
})
export class ContentGridModule {}
