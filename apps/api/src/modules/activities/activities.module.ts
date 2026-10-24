import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { ActivitiesController } from './controllers/activities.controller';
import { ActivitiesService } from './services/activities.service';

@Module({
  imports: [SharedModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
