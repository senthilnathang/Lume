import { Injectable } from '@nestjs/common';
import {
  WorkflowDefinition,
  WorkflowStep,
  ConditionExpr,
  MetadataRegistryService,
  ExecutionContext,
} from '@core/runtime/metadata-registry.service';
import { EventBusService, BuiltInEvents, LumeEvent } from '@core/runtime/event-bus.service';
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
  workflow: WorkflowDefinition;
  record: any;
  entityName: string;
  userId?: number;
  variables: Record<string, any>;
  stepsLog: Array<{ stepIndex: number; stepType: string; result?: any; error?: string }>;
}

@Injectable()
export class WorkflowExecutorService {
  private workflowRuns = new Map<number, WorkflowRun>();
  private runCounter = 1;
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
  ): Promise<WorkflowRun> {
    const workflow = this.metadataRegistry.getWorkflow(workflowName);
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

    this.workflowRuns.set(runId, run);

    // Emit workflow started event
    this.eventBus.emit({
      type: BuiltInEvents.WORKFLOW_STARTED,
      timestamp: new Date(),
      source: 'workflow-executor',
      data: { workflowName, recordId: record.id },
    });

    try {
      const context: WorkflowRunContext = {
        workflow,
        record,
        entityName,
        userId,
        variables: { ...record }, // Initialize with record data
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
  ): Promise<void> {
    const stepLog = { stepIndex, stepType: step.type };

    try {
      switch (step.type) {
        case 'condition':
          await this.executeCondition(step as any, context, stepIndex);
          break;

        case 'set_field':
          {
            const fieldStep = step as any;
            const value = this.evaluateExpression(fieldStep.value, context);
            context.variables[fieldStep.field] = value;
            context.record[fieldStep.field] = value;
            stepLog.result = { field: fieldStep.field, value };
          }
          break;

        case 'send_notification':
          {
            const notifStep = step as any;
            // Stub: in real implementation, integrate with notification service
            console.log(`Sending notification to ${notifStep.to} using template ${notifStep.template}`);
            stepLog.result = { sent: true };
          }
          break;

        case 'call_webhook':
          {
            const webhookStep = step as any;
            // Stub: in real implementation, make actual HTTP request
            console.log(`Calling webhook: ${webhookStep.method} ${webhookStep.url}`);
            stepLog.result = { status: 200 };
          }
          break;

        case 'create_record':
          {
            const createStep = step as any;
            const data = this.evaluateExpression(createStep.data, context);
            // Stub: in real implementation, call entity service to create record
            console.log(`Creating record in entity ${createStep.entity}:`, data);
            stepLog.result = { id: Math.floor(Math.random() * 10000), ...data };
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

        case 'ai':
          {
            const aiStep = step as any;
            // Stub: in real implementation, call AI service
            const prompt = this.evaluateExpression(aiStep.prompt, context);
            console.log(`AI step prompt: ${prompt}`);
            context.variables[aiStep.outputField] = 'AI response stub';
            context.record[aiStep.outputField] = 'AI response stub';
            stepLog.result = { output: 'AI response stub' };
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
          throw new Error(`Unknown step type: ${step.type}`);
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
  ): Promise<void> {
    const conditionResult = this.evaluateExpression(step.if, context);

    if (conditionResult) {
      // Execute 'then' steps
      if (step.then && Array.isArray(step.then)) {
        for (let i = 0; i < step.then.length; i++) {
          await this.executeStep(step.then[i], context, parentStepIndex);
        }
      }
    } else {
      // Execute 'else' steps if provided
      if (step.else && Array.isArray(step.else)) {
        for (let i = 0; i < step.else.length; i++) {
          await this.executeStep(step.else[i], context, parentStepIndex);
        }
      }
    }

    context.stepsLog.push({
      stepIndex: parentStepIndex,
      stepType: 'condition',
      result: { condition: conditionResult },
    });
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
      // Evaluate object expressions recursively
      const result: any = {};
      for (const [key, value] of Object.entries(expr)) {
        result[key] = this.evaluateExpression(value, context);
      }
      return result;
    }

    return expr;
  }

  private convertDelayToMs(duration: number, unit: string): number {
    const unitMs: Record<string, number> = {
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
    };
    return duration * (unitMs[unit] || 1000);
  }

  private registerDefaultHandlers(): void {
    // Register any default custom handlers here
  }
}
