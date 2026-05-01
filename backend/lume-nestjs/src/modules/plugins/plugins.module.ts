import { Module } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { PluginPersistenceService } from './services/plugin-persistence.service';
import { SemverService } from './services/semver.service';
import { MarketplaceService } from './services/marketplace.service';
import { CatalogSeederService } from './services/catalog-seeder.service';
import { SubmissionService } from './services/submission.service';
import { MarketplaceController } from './controllers/marketplace.controller';
import { DeveloperController } from './controllers/developer.controller';
import { AdminMarketplaceController } from './controllers/admin-marketplace.controller';

@Module({
  imports: [],
  providers: [
    DrizzleService,
    PluginPersistenceService,
    SemverService,
    MarketplaceService,
    CatalogSeederService,
    SubmissionService,
  ],
  controllers: [
    MarketplaceController,
    DeveloperController,
    AdminMarketplaceController,
  ],
  exports: [
    PluginPersistenceService,
    SemverService,
    MarketplaceService,
    SubmissionService,
  ],
})
export class PluginsModule {}
