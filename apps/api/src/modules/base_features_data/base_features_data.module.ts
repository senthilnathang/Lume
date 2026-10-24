import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { FeaturesDataService } from './services/features-data.service';
import { FeaturesDataController } from './controllers/features-data.controller';
import { FeatureFlagEvaluatorService } from './services/feature-flag-evaluator.service';

@Module({
  imports: [SharedModule],
  controllers: [FeaturesDataController],
  providers: [FeaturesDataService, FeatureFlagEvaluatorService],
  exports: [FeaturesDataService],
})
export class BaseFeaturesDataModule {}
