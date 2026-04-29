import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MetadataRegistryService } from '@core/runtime/metadata-registry.service';
import { ExecutionPipelineService } from '@core/runtime/execution-pipeline.service';
import { EventBusService } from '@core/runtime/event-bus.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [MetadataRegistryService, ExecutionPipelineService, EventBusService],
  exports: [MetadataRegistryService, ExecutionPipelineService, EventBusService],
})
export class RuntimeModule {}
