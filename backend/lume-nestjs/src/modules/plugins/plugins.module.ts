import { Module } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { PluginPersistenceService } from './services/plugin-persistence.service';
import { SemverService } from './services/semver.service';

@Module({
  imports: [],
  providers: [DrizzleService, PluginPersistenceService, SemverService],
  exports: [PluginPersistenceService, SemverService],
})
export class PluginsModule {}
