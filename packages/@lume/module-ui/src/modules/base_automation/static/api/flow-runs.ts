import { get, post } from '@/api/request';
export interface FlowRun {
  id: number; status: string; attempts: number; error: string | null;
  createdAt: string; updatedAt: string; workerEnabled: boolean;
}
export const runFlow = (flowId: number, recordId: number, requestId: string) => post<FlowRun>(`/automation/flows/${flowId}/run`, { recordId, requestId });
export const listFlowRuns = (flowId: number) => get<{ items: FlowRun[]; workerEnabled: boolean }>(`/automation/flows/${flowId}/runs`);
