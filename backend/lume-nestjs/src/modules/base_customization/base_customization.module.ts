import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { CustomizationService } from './services/customization.service';
import { FormLayoutService } from './services/form-layout.service';
import { CustomizationController } from './controllers/customization.controller';

@Module({
  imports: [SharedModule],
  controllers: [CustomizationController],
  providers: [CustomizationService, FormLayoutService],
  exports: [CustomizationService, FormLayoutService],
})
export class BaseCustomizationModule {}
