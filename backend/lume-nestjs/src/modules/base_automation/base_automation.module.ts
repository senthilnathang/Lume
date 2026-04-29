import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { AutomationService } from './services/automation.service';
import { AutomationController } from './controllers/automation.controller';

@Module({
  imports: [SharedModule],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class BaseAutomationModule {}
