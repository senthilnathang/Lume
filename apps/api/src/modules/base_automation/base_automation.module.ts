import { WorkflowStateController } from './controllers/workflow-state.controller';
import { WorkflowStateEngineService } from './services/workflow-state-engine.service';
import { Module } from '@nestjs/common';
import { RecordService } from '@modules/base/services/record.service';
import { FormulaService } from '@modules/base/services/formula.service';
import { SharedModule } from '@core/modules/shared.module';
import { AutomationService } from './services/automation.service';
import { BusinessRuleEngineService } from './services/business-rule-engine.service';
import { ValidationRuleEngineService } from './services/validation-rule-engine.service';
import { AssignmentRuleEngineService } from './services/assignment-rule-engine.service';
import { RollupEngineService } from './services/rollup-engine.service';
import { ApprovalChainEngineService } from './services/approval-chain-engine.service';
import { AutomationController } from './controllers/automation.controller';
import { ApprovalRequestsController } from './controllers/approval-requests.controller';
import { ApprovalTriggerService } from './services/approval-trigger.service';

@Module({
  imports: [SharedModule],
  controllers: [WorkflowStateController, AutomationController, ApprovalRequestsController],
  providers: [
    WorkflowStateEngineService,
    RecordService,
    FormulaService,
    AutomationService,
    BusinessRuleEngineService,
    ValidationRuleEngineService,
    AssignmentRuleEngineService,
    RollupEngineService,
    ApprovalChainEngineService,
    ApprovalTriggerService,
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
