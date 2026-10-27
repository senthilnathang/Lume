<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import { listSchedules, listScheduledWorkflows, createSchedule, updateSchedule, setScheduleActive, deleteSchedule, type WorkflowSchedule } from '../api/schedules';

const rows = ref<WorkflowSchedule[]>([]);
const workflows = ref<Array<{ name: string; entity: string }>>([]);
const enabled = ref(false);
const loading = ref(false);
const saving = ref(false);
const open = ref(false);
const editing = ref<WorkflowSchedule | null>(null);
const form = reactive({ name: '', workflowName: '', recordId: 1, mode: 'interval', intervalMinutes: 60, cronExpression: '0 * * * *', active: false });
const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Workflow', dataIndex: 'workflowName', key: 'workflowName' },
  { title: 'Record', dataIndex: 'recordId', key: 'recordId' },
  { title: 'Schedule (UTC)', key: 'timing' },
  { title: 'Next run', dataIndex: 'nextRunAt', key: 'nextRunAt' },
  { title: 'Last job', key: 'lastJob' },
  { title: 'Active', key: 'active' },
  { title: 'Actions', key: 'actions' },
];
async function load() {
  loading.value = true;
  try {
    const result = await listSchedules();
    rows.value = result.items; enabled.value = result.schedulerEnabled;
  } catch (error: any) { message.error(error?.message || 'Could not load schedules'); }
  finally { loading.value = false; }
}
async function edit(row?: WorkflowSchedule) {
  try { workflows.value = await listScheduledWorkflows(); }
  catch (error: any) { message.error(error?.message || 'Could not load workflows'); return; }
  editing.value = row ?? null;
  Object.assign(form, row ? { name: row.name, workflowName: row.workflowName, recordId: row.recordId,
    mode: row.cronExpression ? 'cron' : 'interval', intervalMinutes: row.intervalMinutes ?? 60,
    cronExpression: row.cronExpression ?? '0 * * * *', active: row.status === 'active' }
    : { name: '', workflowName: '', recordId: 1, mode: 'interval', intervalMinutes: 60, cronExpression: '0 * * * *', active: false });
  open.value = true;
}
async function save() {
  if (!form.name.trim() || !form.workflowName || !Number.isSafeInteger(form.recordId) || form.recordId < 1) {
    message.warning('Name, workflow and a positive record ID are required'); return;
  }
  saving.value = true;
  const data = { name: form.name.trim(), status: form.active ? 'active' as const : 'inactive' as const,
    cronExpression: form.mode === 'cron' ? form.cronExpression.trim() : null,
    intervalMinutes: form.mode === 'interval' ? form.intervalMinutes : null };
  try {
    if (editing.value) await updateSchedule(editing.value.id, editing.value.version, data);
    else await createSchedule({ ...data, workflowName: form.workflowName, recordId: form.recordId });
    open.value = false; message.success('Schedule saved'); await load();
  } catch (error: any) { message.error(error?.message || 'Could not save schedule'); }
  finally { saving.value = false; }
}
async function toggle(row: WorkflowSchedule) {
  try { await setScheduleActive(row, row.status !== 'active'); await load(); }
  catch (error: any) { message.error(error?.message || 'Could not update schedule'); await load(); }
}
async function remove(row: WorkflowSchedule) {
  try { await deleteSchedule(row.id); message.success('Schedule deleted'); await load(); }
  catch (error: any) { message.error(error?.message || 'Could not delete schedule'); }
}
onMounted(load);
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold m-0">Scheduled workflows</h2>
      <a-space><a-button @click="load">Refresh</a-button><a-button type="primary" @click="edit()">Add schedule</a-button></a-space>
    </div>
    <a-alert v-if="!enabled" type="info" show-icon message="Scheduler is paused. No new scheduled jobs will be queued. Previously queued jobs may still run while the workflow worker is enabled." class="mb-4" />
    <p>Schedules run as you, in the current tenant. Missed occurrences are combined into one run after a restart. Editing or disabling a schedule prevents older queued versions from starting; work already running may finish.</p>
    <a-table :columns="columns" :data-source="rows" :loading="loading" row-key="id" size="middle">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'timing'">{{ record.cronExpression || `Every ${record.intervalMinutes} minutes` }}</template>
        <template v-else-if="column.key === 'lastJob'">
          <span v-if="record.lastJob">#{{ record.lastJob.id }} · {{ record.lastJob.status }}</span>
          <span v-else>Not queued yet</span>
          <p v-if="record.lastError" role="alert">{{ record.lastError }}</p>
        </template>
        <template v-else-if="column.key === 'active'"><a-switch :checked="record.status === 'active'" @change="toggle(record)" /></template>
        <template v-else-if="column.key === 'actions'">
          <a-space><a-button size="small" @click="edit(record)">Edit</a-button>
            <a-popconfirm title="Delete this schedule?" @confirm="remove(record)"><a-button size="small" danger>Delete</a-button></a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>
    <a-modal v-model:open="open" :title="editing ? 'Edit schedule' : 'Create schedule'" :confirm-loading="saving" @ok="save">
      <a-form layout="vertical">
        <a-form-item label="Name" required><a-input v-model:value="form.name" :maxlength="100" /></a-form-item>
        <a-form-item label="Workflow" required help="Registered executable workflows; state-machine and flow-designer definitions are separate.">
          <a-select v-model:value="form.workflowName" :disabled="!!editing" placeholder="Select workflow">
            <a-select-option v-for="workflow in workflows" :key="workflow.name" :value="workflow.name">{{ workflow.name }} ({{ workflow.entity }})</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Record ID" required><a-input-number v-model:value="form.recordId" :min="1" :precision="0" :disabled="!!editing" /></a-form-item>
        <a-form-item label="Schedule"><a-radio-group v-model:value="form.mode"><a-radio-button value="interval">Interval</a-radio-button><a-radio-button value="cron">UTC cron</a-radio-button></a-radio-group></a-form-item>
        <a-form-item v-if="form.mode === 'interval'" label="Minutes between runs"><a-input-number v-model:value="form.intervalMinutes" :min="1" :max="525600" :precision="0" /></a-form-item>
        <a-form-item v-else label="Cron expression" help="Five fields: minute hour day-of-month month day-of-week, evaluated in UTC."><a-input v-model:value="form.cronExpression" :maxlength="100" /></a-form-item>
        <a-form-item label="Active"><a-switch v-model:checked="form.active" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
