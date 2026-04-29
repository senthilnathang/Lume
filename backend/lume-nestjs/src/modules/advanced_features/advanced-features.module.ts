import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { AdvancedFeaturesService } from './services/advanced-features.service';
import { AdvancedFeaturesController } from './controllers/advanced-features.controller';

@Module({
  imports: [SharedModule],
  controllers: [AdvancedFeaturesController],
  providers: [AdvancedFeaturesService],
  exports: [AdvancedFeaturesService],
})
export class AdvancedFeaturesModule {}
