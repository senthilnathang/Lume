import { Global, Module } from '@nestjs/common';
import { SharedModule } from './shared.module';
import { RecordService } from '@modules/base/services/record.service';
import { FormulaService } from '@modules/base/services/formula.service';
import { WorkflowActionsService } from '@core/workflow/workflow-actions.service';
import { WorkflowJobsService } from '@core/workflow/workflow-jobs.service';
import { WorkflowDeliveryService } from '@core/workflow/workflow-delivery.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MetadataRegistryService } from '@core/runtime/metadata-registry.service';
import { ExecutionPipelineService } from '@core/runtime/execution-pipeline.service';
import { EventBusService } from '@core/runtime/event-bus.service';
import { ModuleLoaderService } from '@core/module/module-loader.service';
import { EntityRegistryService } from '@core/entity/entity-registry.service';
import { PolicyEvaluatorService } from '@core/permission/policy-evaluator.service';
import { WorkflowExecutorService } from '@core/workflow/workflow-executor.service';
import { VersioningService } from '@core/versioning/versioning.service';
import { AIAdapterService } from '@core/ai/ai-adapter.service';
import { AskQueryService } from '@core/ai/ask-query.service';
import { PluginRegistryService } from '@core/plugin/plugin-registry.service';
import { PluginsModule } from '../../modules/plugins/plugins.module';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot(), PluginsModule, SharedModule],
  providers: [
    RecordService, FormulaService, WorkflowActionsService, WorkflowJobsService, WorkflowDeliveryService,
    MetadataRegistryService,
    ExecutionPipelineService,
    EventBusService,
    EntityRegistryService,
    ModuleLoaderService,
    PolicyEvaluatorService,
    WorkflowExecutorService,
    VersioningService,
    AIAdapterService,
    AskQueryService,
    PluginRegistryService,
  ],
  exports: [
    WorkflowActionsService,
    WorkflowJobsService,
    MetadataRegistryService,
    ExecutionPipelineService,
    EventBusService,
    EntityRegistryService,
    ModuleLoaderService,
    PolicyEvaluatorService,
    WorkflowExecutorService,
    VersioningService,
    AIAdapterService,
    AskQueryService,
    PluginRegistryService,
  ],
})
export class RuntimeModule {}
