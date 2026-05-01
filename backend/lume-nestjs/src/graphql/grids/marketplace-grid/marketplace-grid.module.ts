import { Module } from '@nestjs/common';
import { PluginsModule } from '@modules/plugins/plugins.module';
import { MarketplaceResolver } from './resolvers/marketplace.resolver.js';

@Module({
  imports: [PluginsModule],
  providers: [MarketplaceResolver],
  exports: [MarketplaceResolver],
})
export class MarketplaceGridModule {}
