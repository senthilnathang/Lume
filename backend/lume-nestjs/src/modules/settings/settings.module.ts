import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { SettingsService } from './services/settings.service';
import { SettingsController } from './controllers/settings.controller';

@Module({
  imports: [SharedModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
