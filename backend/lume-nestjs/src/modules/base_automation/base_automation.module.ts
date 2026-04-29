import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { AutomationService } from './services/automation.service';
import { BusinessRuleEngineService } from './services/business-rule-engine.service';
import { ValidationRuleEngineService } from './services/validation-rule-engine.service';
import { AssignmentRuleEngineService } from './services/assignment-rule-engine.service';
import { RollupEngineService } from './services/rollup-engine.service';
import { ApprovalChainEngineService } from './services/approval-chain-engine.service';
import { AutomationController } from './controllers/automation.controller';

@Module({
  imports: [SharedModule],
  controllers: [AutomationController],
  providers: [
    AutomationService,
    BusinessRuleEngineService,
    ValidationRuleEngineService,
    AssignmentRuleEngineService,
    RollupEngineService,
    ApprovalChainEngineService,
  ],
  exports: [
    AutomationService,
    BusinessRuleEngineService,
    ValidationRuleEngineService,
    AssignmentRuleEngineService,
    RollupEngineService,
    ApprovalChainEngineService,
  ],
})
export class BaseAutomationModule {}
