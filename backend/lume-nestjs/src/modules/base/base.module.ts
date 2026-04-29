import { Module, OnModuleInit } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { EntityRegistryService } from '@core/entity/entity-registry.service';
import { setEntityRegistry } from '@core/entity/extend-entity';
import { WorkflowExecutorService } from '@core/workflow/workflow-executor.service';
import { QueryBuilderService } from '@core/query/query-builder.service';

// Controllers
import { EntityController } from './controllers/entity.controller';
import { EntityRecordsController } from './controllers/entity-records.controller';
import { EntityViewsController } from './controllers/entity-views.controller';
import { QueueController } from './controllers/queue.controller';
import { QueryController } from './controllers/query.controller';

// Services
import { EntityService } from './services/entity.service';
import { RecordService } from './services/record.service';
import { ViewRendererService } from './services/view-renderer.service';
import { QueueService } from './services/queue.service';
import { RelationshipService } from './services/relationship.service';
import { ModuleService } from './services/module.service';
import { SecurityService } from './services/security.service';
import { FieldPermissionService } from './services/field-permission.service';
import { FormulaService } from './services/formula.service';
import { CascadeService } from './services/cascade.service';
import { LookupResolverService } from './services/lookup-resolver.service';

// Entities
import { LeadEntity } from './entities/lead.entity';
import { TicketEntity } from './entities/ticket.entity';

// Workflows
import { LeadAssignmentWorkflow, LeadScoringSendNotification } from './workflows/lead-assignment.workflow';

@Module({
  imports: [SharedModule],
  controllers: [EntityController, EntityRecordsController, EntityViewsController, QueueController, QueryController],
  providers: [
    EntityService,
    RecordService,
    ViewRendererService,
    QueueService,
    RelationshipService,
    ModuleService,
    SecurityService,
    FieldPermissionService,
    FormulaService,
    CascadeService,
    LookupResolverService,
    EntityRegistryService,
    QueryBuilderService,
  ],
  exports: [
    EntityService,
    RecordService,
    ViewRendererService,
    QueueService,
    RelationshipService,
    ModuleService,
    SecurityService,
    FieldPermissionService,
    FormulaService,
    CascadeService,
    LookupResolverService,
    EntityRegistryService,
    QueryBuilderService,
  ],
})
export class BaseModule implements OnModuleInit {
  constructor(
    private entityRegistry: EntityRegistryService,
    private workflowExecutor: WorkflowExecutorService,
  ) {}

  onModuleInit(): void {
    // Register example entities
    this.entityRegistry.register(LeadEntity);
    this.entityRegistry.register(TicketEntity);

    // Register workflows
    this.workflowExecutor.registerCustomHandler(
      'log_existing_lead',
      async (ctx, step) => {
        console.log(`Lead ${ctx.record.id} is already assigned`);
      },
    );

    // Initialize extendEntity() function
    setEntityRegistry(this.entityRegistry);
  }
}
