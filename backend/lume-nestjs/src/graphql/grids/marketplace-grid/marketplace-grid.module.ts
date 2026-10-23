import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { PluginsModule } from '@modules/plugins/plugins.module';
import { MarketplaceResolver } from './resolvers/marketplace.resolver.js';

@Module({
  imports: [SharedModule, PluginsModule],
  providers: [MarketplaceResolver],
  exports: [MarketplaceResolver],
})
export class MarketplaceGridModule {}
