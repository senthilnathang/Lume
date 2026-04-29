import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';

// Controllers
import { EntityController } from './controllers/entity.controller';
import { EntityRecordsController } from './controllers/entity-records.controller';
import { EntityViewsController } from './controllers/entity-views.controller';
import { QueueController } from './controllers/queue.controller';

// Services
import { EntityService } from './services/entity.service';
import { RecordService } from './services/record.service';
import { ViewRendererService } from './services/view-renderer.service';
import { QueueService } from './services/queue.service';
import { RelationshipService } from './services/relationship.service';
import { ModuleService } from './services/module.service';
import { SecurityService } from './services/security.service';

@Module({
  imports: [SharedModule],
  controllers: [EntityController, EntityRecordsController, EntityViewsController, QueueController],
  providers: [
    EntityService,
    RecordService,
    ViewRendererService,
    QueueService,
    RelationshipService,
    ModuleService,
    SecurityService,
  ],
  exports: [
    EntityService,
    RecordService,
    ViewRendererService,
    QueueService,
    RelationshipService,
    ModuleService,
    SecurityService,
  ],
})
export class BaseModule {}
