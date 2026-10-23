import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@core/services/prisma.service';
import { RecordCreatedEvent, RecordUpdatedEvent } from '@modules/base/events/record.events';
import { ApprovalChainEngineService } from './approval-chain-engine.service';

@Injectable()
export class ApprovalTriggerService {
  private readonly logger = new Logger(ApprovalTriggerService.name);
  constructor(private prisma: PrismaService, private approvals: ApprovalChainEngineService) {}

  @OnEvent('record.created',{suppressErrors:false})
  async handleRecordCreated(event: RecordCreatedEvent) { await this.trigger('record.created',event); }

  @OnEvent('record.updated',{suppressErrors:false})
  async handleRecordUpdated(event: RecordUpdatedEvent) { await this.trigger('record.updated',event); }

  private async trigger(kind: 'record.created' | 'record.updated', event: RecordCreatedEvent | RecordUpdatedEvent) {
    if (![event?.entityId,event?.record?.id,event?.record?.companyId,event?.userId].every(id=>Number.isSafeInteger(id) && id>0) || event.record.entityId !== event.entityId) return;
    try {
      const entity = await this.prisma.entity.findFirst({where:{id:event.entityId,deletedAt:null}});
      if (!entity) return;
      const chains = await this.prisma.automation_approval_chains.findMany({where:{model:entity.name,status:'active',trigger_event:{in:[kind,'record.saved']}},orderBy:{id:'asc'}});
      for (const chain of chains) {
        try {
          await this.approvals.startAutomatically({chainId:chain.id,recordEntityId:event.entityId,recordId:event.record.id},
            {companyId:event.record.companyId,userId:event.userId},kind,event.eventKey);
        } catch (error: any) {
          // A failed chain must not suppress later independent chains or undo a committed record.
          this.logger.error(`Automatic approval failed for chain ${chain.id}, record ${event.record.id}: ${error.message}`);
          if(event.durable)throw error;
        }
      }
    } catch (error: any) {
      this.logger.error(`Automatic approval lookup failed for entity ${event.entityId}: ${error.message}`);
      if(event.durable)throw error;
    }
  }
}
