import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MetadataRegistryService } from '@core/runtime/metadata-registry.service';
import { ExecutionPipelineService } from '@core/runtime/execution-pipeline.service';
import { EventBusService } from '@core/runtime/event-bus.service';
import { ModuleLoaderService } from '@core/module/module-loader.service';
import { EntityRegistryService } from '@core/entity/entity-registry.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    MetadataRegistryService,
    ExecutionPipelineService,
    EventBusService,
    EntityRegistryService,
    ModuleLoaderService,
  ],
  exports: [
    MetadataRegistryService,
    ExecutionPipelineService,
    EventBusService,
    EntityRegistryService,
    ModuleLoaderService,
  ],
})
export class RuntimeModule {}
