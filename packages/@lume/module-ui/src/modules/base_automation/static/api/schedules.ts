import { get, post, put, del } from '@/api/request';

export interface WorkflowSchedule {
  id: number; name: string; workflowName: string; recordId: number;
  cronExpression: string | null; intervalMinutes: number | null;
  status: 'active' | 'inactive'; version: number;
  nextRunAt: string | null; lastQueuedAt: string | null; lastError: string | null;
  lastJob?: { id: number; status: string; attempts: number } | null;
}
export interface ScheduleInput {
  name: string; workflowName: string; recordId: number;
  cronExpression: string | null; intervalMinutes: number | null; status: 'active' | 'inactive';
}
export const listSchedules = () => get<{ items: WorkflowSchedule[]; schedulerEnabled: boolean }>('/automation/scheduled');
export const listScheduledWorkflows = () => get<Array<{ name: string; entity: string }>>('/automation/scheduled/workflows');
export const createSchedule = (data: ScheduleInput) => post<WorkflowSchedule>('/automation/scheduled', data);
export const updateSchedule = (id: number, version: number, data: Pick<ScheduleInput, 'name' | 'cronExpression' | 'intervalMinutes' | 'status'>) => put<WorkflowSchedule>(`/automation/scheduled/${id}`, { ...data, version });
export const setScheduleActive = (row: WorkflowSchedule, active: boolean) => put<WorkflowSchedule>(`/automation/scheduled/${row.id}`, { version: row.version, status: active ? 'active' : 'inactive' });
export const deleteSchedule = (id: number) => del(`/automation/scheduled/${id}`);
