<script setup lang="ts">
import { ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { getFlow, updateFlow, activateFlow, deactivateFlow, type Flow } from '../api/index';
import { listFlowRuns, runFlow, type FlowRun } from '../api/flow-runs';
const props = defineProps<{ flowId: number }>();
const emit = defineEmits<{ saved: [] }>();
const flow = ref<Flow | null>(null);
const nodes = ref('[]'), edges = ref('[]');
const recordId = ref(1);
const busy = ref(false), workerEnabled = ref(false);
const runs = ref<FlowRun[]>([]);
let pending: { recordId: number; requestId: string } | null = null;
const columns = [
  { title: 'Run', dataIndex: 'id' }, { title: 'Status', dataIndex: 'status' },
  { title: 'Attempts', dataIndex: 'attempts' }, { title: 'Updated', dataIndex: 'updatedAt' },
  { title: 'Error', dataIndex: 'error' },
];
async function refreshRuns() {
  try { const result = await listFlowRuns(props.flowId); runs.value = result.items; workerEnabled.value = result.workerEnabled; }
  catch (error: any) { message.error(error?.message || 'Could not load flow runs'); }
}
async function load() {
  busy.value = true; pending = null; flow.value = null; runs.value = [];
  try {
    const result = await getFlow(props.flowId); flow.value = result;
    nodes.value = JSON.stringify(result.nodes ?? [], null, 2); edges.value = JSON.stringify(result.edges ?? [], null, 2);
    await refreshRuns();
  } catch (error: any) { message.error(error?.message || 'Could not load flow'); }
  finally { busy.value = false; }
}
function starter() {
  nodes.value = JSON.stringify([
    { id: 'start', type: 'trigger_manual', config: {} },
    { id: 'update', type: 'action_set_field', config: { fieldName: 'name', value: 'Updated' } },
    { id: 'end', type: 'end_success', config: {} },
  ], null, 2);
  edges.value = JSON.stringify([{ source: 'start', target: 'update' }, { source: 'update', target: 'end' }], null, 2);
}
async function save() {
  busy.value = true;
  try {
    const graphNodes = JSON.parse(nodes.value), graphEdges = JSON.parse(edges.value);
    if (!Array.isArray(graphNodes) || !Array.isArray(graphEdges)) throw new Error('Nodes and edges must be JSON arrays');
    flow.value = await updateFlow(props.flowId, { nodes: graphNodes, edges: graphEdges });
    emit('saved'); message.success('Graph saved');
  } catch (error: any) { message.error(error?.message || 'Could not save graph'); }
  finally { busy.value = false; }
}
async function activation() {
  busy.value = true;
  try {
    if (flow.value?.status === 'active') await deactivateFlow(props.flowId); else await activateFlow(props.flowId);
    emit('saved'); await load();
  } catch (error: any) { message.error(error?.message || 'Could not change activation'); }
  finally { busy.value = false; }
}
async function run() {
  if (!Number.isSafeInteger(recordId.value) || recordId.value < 1) { message.warning('A positive record ID is required'); return; }
  busy.value = true;
  if (!pending || pending.recordId !== recordId.value) pending = { recordId: recordId.value, requestId: crypto.randomUUID() };
  try {
    const result = await runFlow(props.flowId, pending.recordId, pending.requestId);
    pending = null; message.success(`Run ${result.id} queued`); await refreshRuns();
  } catch (error: any) { message.error(error?.message || 'Could not queue flow'); }
  finally { busy.value = false; }
}
watch(() => props.flowId, load, { immediate: true });
</script>

<template>
  <a-spin :spinning="busy">
    <div v-if="flow">
      <h3>{{ flow.name }} · {{ flow.status }}</h3>
      <p>Manual flows run from trigger_manual to end_success. Supported actions: action_set_field with fieldName/value, action_update_record with data, action_create_record with entity/data, and action_send_notification with recipientId/message and an optional title. Loops, timers and external actions are not supported yet.</p>
      <p>Use condition_if with config: {"condition":{"name":"Reviewed"}}. Give its two outgoing edges branch: "then" and branch: "else". Paths may merge. Conditions require readable, unmasked fields; each run saves its choice so retries follow the same path. Graphs allow up to 100 nodes, 10 condition levels and 1000 expanded steps.</p>
      <p>Notifications appear in the recipient's in-app inbox. Sender and recipient must have access to the source record; field references use only data both can read.</p>
      <p>Use action_update_record to change 1–100 fields on the source record together, for example config: {"data":{"name":"Reviewed","enabled":false}}. Every field must be writable; if validation or receipt persistence fails, none of that action's changes are saved.</p>
      <p>Changes here must be saved before activation or running. Each action commits separately; failed runs retry completed actions safely. Earlier effects remain if a later action fails.</p>
      <a-space class="mb-4">
        <a-button v-if="!flow.nodes?.length" :disabled="busy" @click="starter">Use starter graph</a-button>
        <a-button :disabled="busy" @click="save">Save graph</a-button>
        <a-button :disabled="busy" @click="activation">{{ flow.status === 'active' ? 'Deactivate' : 'Activate saved graph' }}</a-button>
      </a-space>
      <a-form layout="vertical">
        <a-form-item label="Nodes (JSON)"><a-textarea v-model:value="nodes" :rows="12" /></a-form-item>
        <a-form-item label="Edges (JSON)"><a-textarea v-model:value="edges" :rows="6" /></a-form-item>
      </a-form>
      <a-alert v-if="!workerEnabled" type="info" show-icon message="Workflow worker is paused. Runs can be queued but will not execute until it is enabled." class="mb-4" />
      <a-space class="mb-4">
        <label>Record ID <a-input-number v-model:value="recordId" :min="1" :max="2147483647" :precision="0" /></label>
        <a-button type="primary" :disabled="busy || flow.status !== 'active'" @click="run">Run saved flow</a-button>
        <a-button :disabled="busy" @click="refreshRuns">Refresh runs</a-button>
      </a-space>
      <a-table :data-source="runs" :columns="columns" row-key="id" size="small" />
    </div>
  </a-spin>
</template>
