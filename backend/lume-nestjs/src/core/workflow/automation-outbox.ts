import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
export const durableEvents = () => process.env.AUTOMATION_DURABLE_EVENTS === 'true';
export async function enqueueAutomationEvent(tx:Prisma.TransactionClient,kind:string,event:any){
  if(!durableEvents())return;
  const companyId=event.companyId??event.record?.companyId;
  if(!Number.isSafeInteger(companyId)||companyId<1||!Number.isSafeInteger(event.userId)||event.userId<1)throw new Error('Automation event requires tenant and actor');
  await tx.automationJob.create({data:{eventKey:`event:${randomUUID()}`,kind,companyId,userId:event.userId,payload:JSON.stringify(event)}});
}
