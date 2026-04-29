import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { AutomationService } from './services/automation.service';
import { BusinessRuleEngineService } from './services/business-rule-engine.service';
import { AutomationController } from './controllers/automation.controller';

@Module({
  imports: [SharedModule],
  controllers: [AutomationController],
  providers: [AutomationService, BusinessRuleEngineService],
  exports: [AutomationService, BusinessRuleEngineService],
})
export class BaseAutomationModule {}
