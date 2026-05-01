import { Module } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { PluginPersistenceService } from './services/plugin-persistence.service';
import { SemverService } from './services/semver.service';
import { MarketplaceService } from './services/marketplace.service';
import { CatalogSeederService } from './services/catalog-seeder.service';
import { MarketplaceController } from './controllers/marketplace.controller';

@Module({
  imports: [],
  providers: [
    DrizzleService,
    PluginPersistenceService,
    SemverService,
    MarketplaceService,
    CatalogSeederService,
  ],
  controllers: [MarketplaceController],
  exports: [PluginPersistenceService, SemverService, MarketplaceService],
})
export class PluginsModule {}
