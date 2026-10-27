import { Allow, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, IsIn } from 'class-validator';

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model: string;
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
  @IsOptional()
  @IsArray()
  states?: any[];
  @IsOptional()
  @IsArray()
  transitions?: any[];
  @IsOptional()
  @IsString()
  @MaxLength(50)
  initialState?: string;
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'active', 'inactive'])
  status?: string;
}

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model?: string;
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
  @IsOptional()
  @IsArray()
  states?: any[];
  @IsOptional()
  @IsArray()
  transitions?: any[];
  @IsOptional()
  @IsString()
  @MaxLength(50)
  initialState?: string;
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'active', 'inactive'])
  status?: string;
}

export class CreateFlowDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model: string;
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
  @IsOptional()
  @IsArray()
  nodes?: any[];
  @IsOptional()
  @IsArray()
  edges?: any[];
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsIn(['record', 'schedule', 'manual', 'api', 'subflow'])
  trigger?: string;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsIn(['draft', 'active', 'inactive'])
  status?: string;
}

export class UpdateFlowDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model?: string;
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
  @IsOptional()
  @IsArray()
  nodes?: any[];
  @IsOptional()
  @IsArray()
  edges?: any[];
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsIn(['record', 'schedule', 'manual', 'api', 'subflow'])
  trigger?: string;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsIn(['draft', 'active', 'inactive'])
  status?: string;
}

export class CreateBusinessRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  field: string;
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
  @IsOptional()
  @Allow()
  condition?: any;
  @IsOptional()
  @Allow()
  action?: any;
  @IsOptional()
  @IsInt()
  priority?: number;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}

export class UpdateBusinessRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
  @IsOptional()
  @Allow()
  condition?: any;
  @IsOptional()
  @Allow()
  action?: any;
  @IsOptional()
  @IsInt()
  priority?: number;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}

export class CreateApprovalChainDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  onCompleted?: string | null;
  @IsOptional()
  @IsString()
  @MaxLength(100)
  onRejected?: string | null;
  @IsOptional()
  @IsIn(['manual', 'record.created', 'record.updated', 'record.saved'])
  triggerEvent?: 'manual' | 'record.created' | 'record.updated' | 'record.saved';
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model: string;
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
  @IsOptional()
  @IsArray()
  steps?: any[];
  @IsOptional()
  @Allow()
  condition?: any;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}

export class UpdateApprovalChainDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  onCompleted?: string | null;
  @IsOptional()
  @IsString()
  @MaxLength(100)
  onRejected?: string | null;
  @IsOptional()
  @IsIn(['manual', 'record.created', 'record.updated', 'record.saved'])
  triggerEvent?: 'manual' | 'record.created' | 'record.updated' | 'record.saved';
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
  @IsOptional()
  @IsArray()
  steps?: any[];
  @IsOptional()
  @Allow()
  condition?: any;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}

export class CreateValidationRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model: string;
  @IsOptional()
  @IsString()
  @MaxLength(100)
  field?: string;
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ruleType?: string;
  @IsOptional()
  @Allow()
  config?: any;
  @IsOptional()
  @IsString()
  @MaxLength(255)
  errorMessage?: string;
  @IsOptional()
  @IsInt()
  priority?: number;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}

export class UpdateValidationRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ruleType?: string;
  @IsOptional()
  @Allow()
  config?: any;
  @IsOptional()
  @IsString()
  @MaxLength(255)
  errorMessage?: string;
  @IsOptional()
  @IsInt()
  priority?: number;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}

export class CreateAssignmentRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model: string;
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  assignTo?: string;
  @IsOptional()
  @IsInt()
  assigneeId?: number;
  @IsOptional()
  @Allow()
  condition?: any;
  @IsOptional()
  @IsInt()
  priority?: number;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}

export class UpdateAssignmentRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  assignTo?: string;
  @IsOptional()
  @IsInt()
  assigneeId?: number;
  @IsOptional()
  @Allow()
  condition?: any;
  @IsOptional()
  @IsInt()
  priority?: number;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}

export class CreateRollupFieldDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  parentModel: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  childModel: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  rollupField: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  targetField: string;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  operation?: string;
  @IsOptional()
  @Allow()
  filterCondition?: any;
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}

export class UpdateRollupFieldDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  operation?: string;
  @IsOptional()
  @Allow()
  filterCondition?: any;
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}
