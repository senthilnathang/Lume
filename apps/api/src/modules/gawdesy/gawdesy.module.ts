import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { GawdesyService } from './services/gawdesy.service';
import { GawdesyController } from './controllers/gawdesy.controller';

@Module({
  imports: [SharedModule],
  controllers: [GawdesyController],
  providers: [GawdesyService],
  exports: [GawdesyService],
})
export class GawdesyModule {}
