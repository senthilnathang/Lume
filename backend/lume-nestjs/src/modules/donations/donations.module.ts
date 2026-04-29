import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { DonationsService } from './services/donations.service';
import { DonationsController } from './controllers/donations.controller';

@Module({
  imports: [SharedModule],
  controllers: [DonationsController],
  providers: [DonationsService],
  exports: [DonationsService],
})
export class DonationsModule {}
