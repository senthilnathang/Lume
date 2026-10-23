import { Injectable } from '@nestjs/common';
import {
  WorkflowDefinition,
  WorkflowStep,
  MetadataRegistryService,
} from '@core/runtime/metadata-registry.service';
import { EventBusService, BuiltInEvents } from '@core/runtime/event-bus.service';
import { ExecutionPipelineService } from '@core/runtime/execution-pipeline.service';
import { PrismaService } from '@core/services/prisma.service';

export interface WorkflowRun {
  id?: number;
  workflowName: string;
  workflowVersion?: string;
  entityId?: number;
  recordId?: number;
  triggerType: string;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  stepsLog?: Array<{ stepIndex: number; stepType: string; result?: any; error?: string }>;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
  triggeredBy?: number;
}

export interface WorkflowRunContext {
  companyId?: number;
  executionKey?: string;
  stepKey?: string;
  workflow: WorkflowDefinition;
  record: any;
  entityName: string;
  userId?: number;
  variables: Record<string, any>;
  stepsLog: Array<{ stepIndex: number; stepType: string; result?: any; error?: string }>;
}

export type WorkflowActionType = 'send_notification' | 'call_webhook' | 'create_record' | 'ai';
export type WorkflowActionHandler = (ctx: WorkflowRunContext, step: WorkflowStep) => Promise<unknown>;

@Injectable()
export class WorkflowExecutorService {
  private runCounter = 1;
  private actionHandlers = new Map<WorkflowActionType, WorkflowActionHandler>();
  private registeredHandlers = new Map<string, (ctx: WorkflowRunContext, step: any) => Promise<void>>();

  constructor(
    private metadataRegistry: MetadataRegistryService,
    private eventBus: EventBusService,
    private executionPipeline: ExecutionPipelineService,
    private prisma: PrismaService,
  ) {
    // Register default step handlers
    this.registerDefaultHandlers();
  }

  async execute(
    workflowName: string,
    record: any,
    entityName: string,
    triggerEvent: any,
    userId?: number,
    options: { companyId?: number; executionKey?: string; definition?: WorkflowDefinition } = {},
  ): Promise<WorkflowRun> {
    const workflow = options.definition || this.metadataRegistry.getWorkflow(workflowName);
    if (!workflow) {
      throw new Error(`Workflow '${workflowName}' not found`);
    }

    const runId = this.runCounter++;
    const run: WorkflowRun = {
      id: runId,
      workflowName,
      workflowVersion: workflow.version,
      recordId: record.id,
      entityId: record.entityId,
      triggerType: triggerEvent.type || 'manual',
      status: 'running',
      stepsLog: [],
      startedAt: new Date(),
      triggeredBy: userId,
    };


    // Emit workflow started event
    this.eventBus.emit({
      type: BuiltInEvents.WORKFLOW_STARTED,
      timestamp: new Date(),
      source: 'workflow-executor',
      data: { workflowName, recordId: record.id },
    });

    try {
      const context: WorkflowRunContext = {
        companyId: options.companyId,
        executionKey: options.executionKey,
        workflow,
        record,
        entityName,
        userId,
        variables: { ...record.data, ...record },
        stepsLog: run.stepsLog || [],
      };

      // Execute workflow steps
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
          await this.executeStep(step, context, i);
      }

      run.status = 'completed';
      run.completedAt = new Date();

      // Emit workflow completed event
      this.eventBus.emit({
        type: BuiltInEvents.WORKFLOW_COMPLETED,
        timestamp: new Date(),
        source: 'workflow-executor',
        data: { workflowName, recordId: record.id, run },
      });
    } catch (error: any) {
      run.status = 'failed';
      run.errorMessage = error.message;
      run.completedAt = new Date();

      // Emit workflow failed event
      this.eventBus.emit({
        type: BuiltInEvents.WORKFLOW_FAILED,
        timestamp: new Date(),
        source: 'workflow-executor',
        data: { workflowName, recordId: record.id, error: error.message },
      });

      if (workflow.onError === 'stop') {
        throw error;
      }
    }

    return run;
  }

  registerActionHandler(type: WorkflowActionType, handler: WorkflowActionHandler): void {
    if (!['send_notification', 'call_webhook', 'create_record', 'ai'].includes(type) || typeof handler !== 'function') {
      throw new Error('A supported workflow action and callable handler are required');
    }
    this.actionHandlers.set(type, handler);
  }

  registerCustomHandler(
    handlerName: string,
    handler: (ctx: WorkflowRunContext, step: any) => Promise<void>,
  ): void {
    this.registeredHandlers.set(handlerName, handler);
  }

  private async executeStep(
    step: WorkflowStep,
    context: WorkflowRunContext,
    stepIndex: number,
    stepPath = String(stepIndex),
  ): Promise<void> {
    const stepLog: WorkflowRunContext['stepsLog'][number] = { stepIndex, stepType: step.type };
    context.stepKey = stepPath;

    try {
      switch (step.type) {
        case 'condition':
          stepLog.result = { condition: await this.executeCondition(step, context, stepIndex, stepPath) };
          break;

        case 'set_field':
          {
            const fieldStep = step as any;
            if (typeof fieldStep.field !== 'string' || ['__proto__','constructor','prototype'].includes(fieldStep.field)) throw new Error('Invalid workflow field');
            const value = this.evaluateExpression(fieldStep.value, context);
            context.variables[fieldStep.field] = value;
            context.record[fieldStep.field] = value;
            stepLog.result = { field: fieldStep.field, value };
          }
          break;

        case 'send_notification':
        case 'call_webhook':
        case 'create_record':
        case 'ai':
          {
            const handler = this.actionHandlers.get(step.type);
            if (!handler) throw new Error(`Workflow action '${step.type}' is not configured`);
            // Preserve the real adapter's result, without fabricated receipts or IDs.
            stepLog.result = await handler(context, step);
          }
          break;

        case 'delay':
          {
            const delayStep = step as any;
            const ms = this.convertDelayToMs(delayStep.duration, delayStep.unit);
            await new Promise(resolve => setTimeout(resolve, ms));
            stepLog.result = { delayed: ms };
          }
          break;

        case 'custom':
          {
            const customStep = step as any;
            const handler = this.registeredHandlers.get(customStep.handler);
            if (!handler) {
              throw new Error(`Custom handler '${customStep.handler}' not registered`);
            }
            await handler(context, step);
            stepLog.result = { executed: true };
          }
          break;

        default:
          throw new Error(`Unknown step type: ${(step as { type: string }).type}`);
      }

      context.stepsLog.push(stepLog);
    } catch (error: any) {
      stepLog.error = error.message;
      context.stepsLog.push(stepLog);
      throw error;
    }
  }

  private async executeCondition(
    step: any,
    context: WorkflowRunContext,
    parentStepIndex: number,
    stepPath: string,
  ): Promise<boolean> {
    const conditionResult = this.matchesCondition(step.if, context);

    if (conditionResult) {
      // Execute 'then' steps
      if (step.then && Array.isArray(step.then)) {
        for (let i = 0; i < step.then.length; i++) {
          await this.executeStep(step.then[i], context, parentStepIndex, `${stepPath}.then.${i}`);
        }
      }
    } else {
      // Execute 'else' steps if provided
      if (step.else && Array.isArray(step.else)) {
        for (let i = 0; i < step.else.length; i++) {
          await this.executeStep(step.else[i], context, parentStepIndex, `${stepPath}.else.${i}`);
        }
      }
    }

    return conditionResult;
  }

  private evaluateExpression(expr: any, context: WorkflowRunContext): any {
    if (typeof expr === 'string') {
      // Check if it's a variable reference (e.g., ${fieldName})
      if (expr.startsWith('${') && expr.endsWith('}')) {
        const varName = expr.slice(2, -1);
        return context.variables[varName];
      }
      return expr;
    }

    if (typeof expr === 'object' && expr !== null) {
      if (Array.isArray(expr)) return expr.map(value => this.evaluateExpression(value, context));
      // Evaluate object expressions recursively
      const result: any = {};
      for (const [key, value] of Object.entries(expr)) {
        if (['__proto__','constructor','prototype'].includes(key)) throw new Error('Invalid workflow expression key');
        result[key] = this.evaluateExpression(value, context);
      }
      return result;
    }

    return expr;
  }

  private matchesCondition(condition:any,context:WorkflowRunContext):boolean {
    if(typeof condition==='boolean')return condition;
    if(!condition||typeof condition!=='object'||Array.isArray(condition))throw new Error('Invalid workflow condition');
    if(!Object.keys(condition).length)return true;
    const {field,operator}=condition;
    if(typeof field!=='string'||['__proto__','constructor','prototype'].includes(field))throw new Error('Invalid condition field');
    if(!['==','===','!=','!==','>','>=','<','<=','in','not_in'].includes(operator))throw new Error('Unsupported condition operator');
    if(!Object.prototype.hasOwnProperty.call(context.variables,field))return false;
    const actual=context.variables[field],expected=this.evaluateExpression(condition.value,context);
    if(operator==='in'||operator==='not_in'){
      if(!Array.isArray(expected))throw new Error('Condition membership requires an array');
      return operator==='in'?expected.includes(actual):!expected.includes(actual);
    }
    if(operator==='=='||operator==='===')return actual===expected;
    if(operator==='!='||operator==='!==')return actual!==expected;
    if(typeof actual!==typeof expected||!['number','string'].includes(typeof actual))return false;
    switch(operator){case '>':return actual>expected;case '>=':return actual>=expected;case '<':return actual<expected;case '<=':return actual<=expected;}
  }

  private convertDelayToMs(duration: number, unit: string): number {
    const unitMs: Record<string, number> = {
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
    };
    const milliseconds=duration*unitMs[unit];
    if(!Number.isFinite(milliseconds)||milliseconds<0||milliseconds>30000)throw new Error('Workflow delays must be between 0 and 30 seconds; use scheduling for longer waits');
    return milliseconds;
  }

  private registerDefaultHandlers(): void {
    // Register any default custom handlers here
  }
}
