export class CreateWorkflowDto {
  name: string;
  model: string;
  description?: string;
  states?: any[];
  transitions?: any[];
  initialState?: string;
  status?: string;
}

export class UpdateWorkflowDto {
  name?: string;
  description?: string;
  states?: any[];
  transitions?: any[];
  initialState?: string;
  status?: string;
}

export class CreateFlowDto {
  name: string;
  model: string;
  description?: string;
  nodes?: any[];
  edges?: any[];
  trigger?: string;
  status?: string;
}

export class UpdateFlowDto {
  name?: string;
  description?: string;
  nodes?: any[];
  edges?: any[];
  trigger?: string;
  status?: string;
}

export class CreateBusinessRuleDto {
  name: string;
  model: string;
  field: string;
  description?: string;
  condition?: any;
  action?: any;
  priority?: number;
  status?: string;
}

export class UpdateBusinessRuleDto {
  name?: string;
  description?: string;
  condition?: any;
  action?: any;
  priority?: number;
  status?: string;
}

export class CreateApprovalChainDto {
  name: string;
  model: string;
  description?: string;
  steps?: any[];
  condition?: any;
  status?: string;
}

export class UpdateApprovalChainDto {
  name?: string;
  description?: string;
  steps?: any[];
  condition?: any;
  status?: string;
}

export class CreateScheduledActionDto {
  name: string;
  model?: string;
  description?: string;
  actionType?: string;
  config?: any;
  cronExpression?: string;
  interval?: number;
  intervalUnit?: string;
  status?: string;
}

export class UpdateScheduledActionDto {
  name?: string;
  description?: string;
  actionType?: string;
  config?: any;
  cronExpression?: string;
  interval?: number;
  intervalUnit?: string;
  status?: string;
}

export class CreateValidationRuleDto {
  name: string;
  model: string;
  field?: string;
  description?: string;
  ruleType?: string;
  config?: any;
  errorMessage?: string;
  priority?: number;
  status?: string;
}

export class UpdateValidationRuleDto {
  name?: string;
  description?: string;
  ruleType?: string;
  config?: any;
  errorMessage?: string;
  priority?: number;
  status?: string;
}

export class CreateAssignmentRuleDto {
  name: string;
  model: string;
  description?: string;
  assignTo?: string;
  assigneeId?: number;
  condition?: any;
  priority?: number;
  status?: string;
}

export class UpdateAssignmentRuleDto {
  name?: string;
  description?: string;
  assignTo?: string;
  assigneeId?: number;
  condition?: any;
  priority?: number;
  status?: string;
}

export class CreateRollupFieldDto {
  name: string;
  parentModel: string;
  childModel: string;
  rollupField: string;
  targetField: string;
  operation?: string;
  filterCondition?: any;
  description?: string;
  status?: string;
}

export class UpdateRollupFieldDto {
  name?: string;
  operation?: string;
  filterCondition?: any;
  description?: string;
  status?: string;
}
