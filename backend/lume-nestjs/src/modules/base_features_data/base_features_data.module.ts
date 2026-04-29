import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { FeaturesDataService } from './services/features-data.service';
import { FeaturesDataController } from './controllers/features-data.controller';

@Module({
  imports: [SharedModule],
  controllers: [FeaturesDataController],
  providers: [FeaturesDataService],
  exports: [FeaturesDataService],
})
export class BaseFeaturesDataModule {}
