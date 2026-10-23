import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@core/services/prisma.service';
import { RecordService } from '@modules/base/services/record.service';
import { RecordCreatedEvent } from '@modules/base/events/record.events';

@Injectable()
export class AssignmentRuleEngineService {
  constructor(private prisma: PrismaService, private records: RecordService) {}

  @OnEvent('record.created',{suppressErrors:false})
  async handleRecordCreated(event: RecordCreatedEvent) {
    try {
      const { entityId, record, userId } = event;
      if (![entityId, record?.id, record?.companyId, userId].every(id => Number.isSafeInteger(id) && id > 0) || record.entityId !== entityId) return;
      const entity = await this.prisma.entity.findUnique({where:{id:entityId}});
      if (!entity || entity.deletedAt) return;
      const rules = await this.prisma.automation_assignment_rules.findMany({
        where:{model:entity.name,status:'active'}, orderBy:[{priority:'asc'},{id:'asc'}],
      });
      // Preserve the previous default for legacy null priorities, including explicit zero.
      rules.sort((a,b)=>(a.priority ?? 10)-(b.priority ?? 10) || a.id-b.id);
      for (const candidate of rules) {
        const matched = await this.prisma.$transaction(async tx => {
          await tx.$queryRaw(Prisma.sql`SELECT id FROM automation_assignment_rules WHERE id = ${candidate.id} FOR UPDATE`);
          const receiptKey=event.eventKey?`assignment:${event.eventKey}`:null;
          if(receiptKey){
            const receipts=await tx.$queryRaw<any[]>(Prisma.sql`SELECT \`key\` FROM automation_receipts WHERE \`key\`=${receiptKey} FOR UPDATE`);
            if(receipts.length)return true;
          }
          const rule = await tx.automation_assignment_rules.findUnique({where:{id:candidate.id}});
          if (!rule || rule.status !== 'active' || rule.model !== entity.name) return false;
          const records = this.records.withTransaction(tx);
          const current = await records.getRecord(record.id,record.companyId,userId,entityId);
          if (!current) return true;
          if (!this.matches(rule.condition,current.data)) return false;
          if (!Number.isSafeInteger(rule.assignee_id) || rule.assignee_id < 1) throw new BadRequestException('Invalid assignee ID');
          const mode = rule.assign_to ?? 'user';
          if (!['user','role','round_robin'].includes(mode)) throw new BadRequestException('Unsupported assignment mode');
          const users = await tx.user.findMany({
            where:{isActive:true, role:{isActive:true}, ...(mode === 'user' ? {id:rule.assignee_id} : {role_id:rule.assignee_id})},
            orderBy:{id:'asc'}, ...(mode === 'round_robin' ? {} : {take:1}),
          });
          if (!users.length) throw new NotFoundException('No active assignee found');
          const index = mode === 'round_robin' ? ((rule.last_assigned_index ?? -1) + 1) % users.length : 0;
          if (index < 0) throw new BadRequestException('Invalid round-robin cursor');
          const updated = await records.updateRecord(record.id,{assignedTo:users[index].id},record.companyId,userId,entityId,{emitEvent:false});
          if (!updated) throw new NotFoundException('Assignment record disappeared');
          if (mode === 'round_robin') await tx.automation_assignment_rules.update({where:{id:rule.id},data:{last_assigned_index:index}});
          if(receiptKey)await tx.automationReceipt.create({data:{key:receiptKey,result:'{}'}});
          return true;
        });
        if (matched) break;
      }
    } catch (error: any) {
      if(event.durable)throw error;
      console.error(`Assignment rule execution failed for entity ${event.entityId}: ${error.message}`);
    }
  }

  private matches(raw: string | null, record: Record<string, any>): boolean {
    const condition = raw == null ? {} : JSON.parse(raw);
    if (!condition || typeof condition !== 'object' || Array.isArray(condition)) throw new BadRequestException('Invalid assignment condition');
    for (const [field,value] of Object.entries(condition)) {
      if (!Object.prototype.hasOwnProperty.call(record,field)) return false;
      const actual = record[field];
      if (value !== null && typeof value === 'object') {
        if (Array.isArray(value) || !Object.keys(value).length) return false;
        for (const [op,operand] of Object.entries(value)) {
          switch (op) {
            case '$eq': if (actual !== operand) return false; break;
            case '$ne': if (actual === operand) return false; break;
            case '$gt': if (!(actual > operand)) return false; break;
            case '$gte': if (!(actual >= operand)) return false; break;
            case '$lt': if (!(actual < operand)) return false; break;
            case '$lte': if (!(actual <= operand)) return false; break;
            case '$in': if (!Array.isArray(operand) || !operand.includes(actual)) return false; break;
            case '$nin': if (!Array.isArray(operand) || operand.includes(actual)) return false; break;
            default: return false;
          }
        }
      } else if (actual !== value) return false;
    }
    return true;
  }
}
