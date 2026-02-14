<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import {
  Zap, GitBranch, GitMerge, BookOpen, CheckCircle, Clock,
  Plus, RefreshCw, Edit3, Trash2, Play, Pause, Copy,
} from 'lucide-vue-next';
import {
  getWorkflows, createWorkflow, updateWorkflow, deleteWorkflow,
  getFlows, createFlow, updateFlow, deleteFlow, activateFlow, deactivateFlow, cloneFlow,
  getRules, createRule, updateRule, deleteRule, toggleRule,
  getApprovals, createApproval, updateApproval, deleteApproval,
  type Workflow, type Flow, type BusinessRule, type ApprovalChain,
} from '@/api/automation';

defineOptions({ name: 'AutomationView' });

const route = useRoute();
const router = useRouter();

const sections = [
  { label: 'Workflows', value: 'workflows' },
  { label: 'Flows', value: 'flows' },
  { label: 'Business Rules', value: 'business-rules' },
  { label: 'Approvals', value: 'approvals' },
  { label: 'Scheduled', value: 'scheduled' },
];

const activeSection = computed({
  get: () => {
    const seg = route.path.split('/').pop() || 'workflows';
    return sections.some((s) => s.value === seg) ? seg : 'workflows';
  },
  set: () => {},
});

function handleSectionChange(val: string) {
  router.push(`/settings/automation/${val}`);
}

// ---- Shared state ----
const loading = ref(false);

// ---- Workflows ----
const workflows = ref<Workflow[]>([]);
const showWorkflowModal = ref(false);
const workflowFormMode = ref<'create' | 'edit'>('create');
const workflowFormLoading = ref(false);
const editingWorkflow = ref<Workflow | null>(null);
const workflowForm = reactive({
  code: '', name: '', description: '', model_name: '',
  state_field: 'state', default_state: '', is_active: true,
  states: [] as any[], transitions: [] as any[],
});

const modelOptions = [
  { label: 'Leave Request', value: 'hr.leave' },
  { label: 'Expense', value: 'hr.expense' },
  { label: 'Travel Request', value: 'hr.travel' },
  { label: 'Loan Request', value: 'hr.loan' },
  { label: 'Purchase Order', value: 'purchase.order' },
  { label: 'Project', value: 'project.project' },
  { label: 'Task', value: 'project.task' },
];

const workflowColumns: ColumnsType = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Code', key: 'code', width: 140 },
  { title: 'Model', dataIndex: 'model_name', key: 'model_name', width: 160 },
  { title: 'Default State', dataIndex: 'default_state', key: 'default_state', width: 130 },
  { title: 'States', key: 'states', width: 80 },
  { title: 'Active', key: 'active', width: 80 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

async function loadWorkflows() {
  try {
    const res = await getWorkflows();
    workflows.value = Array.isArray(res) ? res : (res as any)?.data || (res as any)?.items || [];
  } catch { workflows.value = []; }
}

function openWorkflowModal(mode: 'create' | 'edit', wf?: Workflow) {
  workflowFormMode.value = mode;
  if (mode === 'edit' && wf) {
    editingWorkflow.value = wf;
    Object.assign(workflowForm, {
      code: wf.code, name: wf.name, description: wf.description || '',
      model_name: wf.model_name, state_field: wf.state_field || 'state',
      default_state: wf.default_state || '', is_active: wf.is_active,
      states: wf.states ? [...wf.states] : [],
      transitions: wf.transitions ? [...wf.transitions] : [],
    });
  } else {
    editingWorkflow.value = null;
    Object.assign(workflowForm, {
      code: '', name: '', description: '', model_name: '',
      state_field: 'state', default_state: '', is_active: true,
      states: [], transitions: [],
    });
  }
  showWorkflowModal.value = true;
}

async function handleWorkflowSubmit() {
  if (!workflowForm.name || !workflowForm.code) { message.warning('Name and Code are required'); return; }
  workflowFormLoading.value = true;
  try {
    if (workflowFormMode.value === 'edit' && editingWorkflow.value) {
      await updateWorkflow(editingWorkflow.value.code, { ...workflowForm });
      message.success('Workflow updated');
    } else {
      await createWorkflow({ ...workflowForm });
      message.success('Workflow created');
    }
    showWorkflowModal.value = false;
    await loadWorkflows();
  } catch (e: any) { message.error(e?.message || 'Failed to save workflow'); }
  finally { workflowFormLoading.value = false; }
}

function handleDeleteWorkflow(wf: Workflow) {
  Modal.confirm({
    title: 'Delete Workflow', content: `Delete "${wf.name}"?`, okType: 'danger', okText: 'Delete',
    async onOk() {
      try { await deleteWorkflow(wf.code); message.success('Deleted'); await loadWorkflows(); }
      catch (e: any) { message.error(e?.message || 'Failed'); }
    },
  });
}

function addState() { workflowForm.states.push({ code: '', name: '', sequence: workflowForm.states.length + 1, color: '#1890ff', is_start: false, is_end: false }); }
function removeState(i: number) { workflowForm.states.splice(i, 1); }
function addTransition() { workflowForm.transitions.push({ from_state: '', to_state: '', name: '', code: '', requires_approval: false }); }
function removeTransition(i: number) { workflowForm.transitions.splice(i, 1); }

// ---- Flows ----
const flows = ref<Flow[]>([]);
const showFlowModal = ref(false);
const flowFormMode = ref<'create' | 'edit'>('create');
const flowFormLoading = ref(false);
const editingFlow = ref<Flow | null>(null);
const flowForm = reactive({ name: '', code: '', description: '', trigger_type: 'manual' as string });

const triggerColors: Record<string, string> = { record: 'blue', schedule: 'orange', manual: 'green', api: 'purple', subflow: 'cyan' };
const statusColors: Record<string, string> = { draft: 'default', active: 'green', inactive: 'red' };

const flowColumns: ColumnsType = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Code', key: 'code', width: 130 },
  { title: 'Trigger', key: 'trigger', width: 110 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Version', dataIndex: 'version', key: 'version', width: 80 },
  { title: 'Actions', key: 'actions', width: 180, fixed: 'right' },
];

async function loadFlows() {
  try {
    const res = await getFlows();
    flows.value = Array.isArray(res) ? res : (res as any)?.data || (res as any)?.items || [];
  } catch { flows.value = []; }
}

function openFlowModal(mode: 'create' | 'edit', f?: Flow) {
  flowFormMode.value = mode;
  if (mode === 'edit' && f) {
    editingFlow.value = f;
    Object.assign(flowForm, { name: f.name, code: f.code, description: f.description || '', trigger_type: f.trigger_type });
  } else {
    editingFlow.value = null;
    Object.assign(flowForm, { name: '', code: '', description: '', trigger_type: 'manual' });
  }
  showFlowModal.value = true;
}

async function handleFlowSubmit() {
  if (!flowForm.name) { message.warning('Name is required'); return; }
  flowFormLoading.value = true;
  try {
    if (flowFormMode.value === 'edit' && editingFlow.value) {
      await updateFlow(editingFlow.value.id, { ...flowForm });
      message.success('Flow updated');
    } else {
      await createFlow({ ...flowForm, status: 'draft', version: 1 });
      message.success('Flow created');
    }
    showFlowModal.value = false;
    await loadFlows();
  } catch (e: any) { message.error(e?.message || 'Failed'); }
  finally { flowFormLoading.value = false; }
}

function handleDeleteFlow(f: Flow) {
  Modal.confirm({
    title: 'Delete Flow', content: `Delete "${f.name}"?`, okType: 'danger', okText: 'Delete',
    async onOk() {
      try { await deleteFlow(f.id); message.success('Deleted'); await loadFlows(); }
      catch (e: any) { message.error(e?.message || 'Failed'); }
    },
  });
}

async function handleActivateFlow(f: Flow) {
  try { await activateFlow(f.id); message.success('Flow activated'); await loadFlows(); }
  catch (e: any) { message.error(e?.message || 'Failed'); }
}

async function handleDeactivateFlow(f: Flow) {
  try { await deactivateFlow(f.id); message.success('Flow deactivated'); await loadFlows(); }
  catch (e: any) { message.error(e?.message || 'Failed'); }
}

async function handleCloneFlow(f: Flow) {
  try { await cloneFlow(f.id); message.success('Flow cloned'); await loadFlows(); }
  catch (e: any) { message.error(e?.message || 'Failed'); }
}

// ---- Business Rules ----
const rules = ref<BusinessRule[]>([]);
const showRuleModal = ref(false);
const ruleFormMode = ref<'create' | 'edit'>('create');
const ruleFormLoading = ref(false);
const editingRuleItem = ref<BusinessRule | null>(null);
const ruleForm = reactive({
  name: '', entity_type: '', is_active: true, priority: 10,
  trigger_on: 'INSERT' as string,
  conditions: [] as any[], actions: [] as any[],
});

const operatorOptions = [
  'EQ', 'NE', 'GT', 'LT', 'GTE', 'LTE', 'IN', 'CONTAINS', 'STARTS_WITH', 'IS_NULL', 'IS_NOT_NULL',
].map((v) => ({ label: v, value: v }));

const actionTypeOptions = [
  'SET_FIELD', 'VALIDATE', 'SEND_EMAIL', 'WEBHOOK', 'LOG',
].map((v) => ({ label: v.replace(/_/g, ' '), value: v }));

const triggerOnColors: Record<string, string> = { INSERT: 'blue', UPDATE: 'orange', DELETE: 'red' };

const ruleColumns: ColumnsType = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Entity Type', dataIndex: 'entity_type', key: 'entity_type', width: 140 },
  { title: 'Trigger', key: 'trigger', width: 100 },
  { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 80 },
  { title: 'Active', key: 'active', width: 80 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

async function loadRules() {
  try {
    const res = await getRules();
    rules.value = Array.isArray(res) ? res : (res as any)?.data || (res as any)?.items || [];
  } catch { rules.value = []; }
}

function openRuleModal(mode: 'create' | 'edit', r?: BusinessRule) {
  ruleFormMode.value = mode;
  if (mode === 'edit' && r) {
    editingRuleItem.value = r;
    Object.assign(ruleForm, {
      name: r.name, entity_type: r.entity_type, is_active: r.is_active,
      priority: r.priority, trigger_on: r.trigger_on,
      conditions: r.conditions ? [...r.conditions] : [],
      actions: r.actions ? [...r.actions] : [],
    });
  } else {
    editingRuleItem.value = null;
    Object.assign(ruleForm, {
      name: '', entity_type: '', is_active: true, priority: 10,
      trigger_on: 'INSERT', conditions: [], actions: [],
    });
  }
  showRuleModal.value = true;
}

async function handleRuleSubmit() {
  if (!ruleForm.name) { message.warning('Name is required'); return; }
  ruleFormLoading.value = true;
  try {
    if (ruleFormMode.value === 'edit' && editingRuleItem.value) {
      await updateRule(editingRuleItem.value.id, { ...ruleForm });
      message.success('Rule updated');
    } else {
      await createRule({ ...ruleForm });
      message.success('Rule created');
    }
    showRuleModal.value = false;
    await loadRules();
  } catch (e: any) { message.error(e?.message || 'Failed'); }
  finally { ruleFormLoading.value = false; }
}

function handleDeleteRule(r: BusinessRule) {
  Modal.confirm({
    title: 'Delete Rule', content: `Delete "${r.name}"?`, okType: 'danger', okText: 'Delete',
    async onOk() {
      try { await deleteRule(r.id); message.success('Deleted'); await loadRules(); }
      catch (e: any) { message.error(e?.message || 'Failed'); }
    },
  });
}

async function handleToggleRule(r: BusinessRule) {
  try { await toggleRule(r.id); message.success(`Rule ${r.is_active ? 'disabled' : 'enabled'}`); await loadRules(); }
  catch (e: any) { message.error(e?.message || 'Failed'); }
}

function addCondition() { ruleForm.conditions.push({ field: '', operator: 'EQ', value: '' }); }
function removeCondition(i: number) { ruleForm.conditions.splice(i, 1); }
function addAction() { ruleForm.actions.push({ action_type: 'SET_FIELD', config: {} }); }
function removeAction(i: number) { ruleForm.actions.splice(i, 1); }

// ---- Approval Chains ----
const approvals = ref<ApprovalChain[]>([]);
const showApprovalModal = ref(false);
const approvalFormMode = ref<'create' | 'edit'>('create');
const approvalFormLoading = ref(false);
const editingApprovalItem = ref<ApprovalChain | null>(null);
const approvalForm = reactive({
  name: '', description: '', is_active: true,
  chain_type: 'SEQUENTIAL' as string, steps: [] as any[],
});

const chainTypeColors: Record<string, string> = { SEQUENTIAL: 'blue', PARALLEL: 'orange', ANY_ONE: 'green' };

const approvalColumns: ColumnsType = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Chain Type', key: 'chainType', width: 130 },
  { title: 'Steps', key: 'steps', width: 80 },
  { title: 'Active', key: 'active', width: 80 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

async function loadApprovals() {
  try {
    const res = await getApprovals();
    approvals.value = Array.isArray(res) ? res : (res as any)?.data || (res as any)?.items || [];
  } catch { approvals.value = []; }
}

function openApprovalModal(mode: 'create' | 'edit', a?: ApprovalChain) {
  approvalFormMode.value = mode;
  if (mode === 'edit' && a) {
    editingApprovalItem.value = a;
    Object.assign(approvalForm, {
      name: a.name, description: a.description || '', is_active: a.is_active,
      chain_type: a.chain_type, steps: a.steps ? [...a.steps] : [],
    });
  } else {
    editingApprovalItem.value = null;
    Object.assign(approvalForm, { name: '', description: '', is_active: true, chain_type: 'SEQUENTIAL', steps: [] });
  }
  showApprovalModal.value = true;
}

async function handleApprovalSubmit() {
  if (!approvalForm.name) { message.warning('Name is required'); return; }
  approvalFormLoading.value = true;
  try {
    if (approvalFormMode.value === 'edit' && editingApprovalItem.value) {
      await updateApproval(editingApprovalItem.value.id, { ...approvalForm });
      message.success('Approval chain updated');
    } else {
      await createApproval({ ...approvalForm });
      message.success('Approval chain created');
    }
    showApprovalModal.value = false;
    await loadApprovals();
  } catch (e: any) { message.error(e?.message || 'Failed'); }
  finally { approvalFormLoading.value = false; }
}

function handleDeleteApproval(a: ApprovalChain) {
  Modal.confirm({
    title: 'Delete Approval Chain', content: `Delete "${a.name}"?`, okType: 'danger', okText: 'Delete',
    async onOk() {
      try { await deleteApproval(a.id); message.success('Deleted'); await loadApprovals(); }
      catch (e: any) { message.error(e?.message || 'Failed'); }
    },
  });
}

function addStep() { approvalForm.steps.push({ sequence: approvalForm.steps.length + 1, approver_type: 'USER', approver_id: '', required: true, escalation_days: undefined }); }
function removeStep(i: number) { approvalForm.steps.splice(i, 1); }

// ---- Data loading ----
async function loadData() {
  loading.value = true;
  try {
    const sec = activeSection.value;
    if (sec === 'workflows') await loadWorkflows();
    else if (sec === 'flows') await loadFlows();
    else if (sec === 'business-rules') await loadRules();
    else if (sec === 'approvals') await loadApprovals();
  } finally { loading.value = false; }
}

function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString();
}

watch(() => route.path, () => { loadData(); });
onMounted(() => { loadData(); });
</script>

<template>
  <div class="automation-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <Zap :size="24" />Automation
        </h1>
        <p class="text-gray-500 m-0">Manage workflows, flows, business rules, and approvals</p>
      </div>
      <a-button @click="loadData" :loading="loading">
        <template #icon><RefreshCw :size="14" /></template>
        Refresh
      </a-button>
    </div>

    <!-- Section Tabs -->
    <a-segmented v-model:value="activeSection" :options="sections" class="mb-6" @change="handleSectionChange" />

    <!-- WORKFLOWS SECTION -->
    <div v-if="activeSection === 'workflows'">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold flex items-center gap-2 m-0"><GitBranch :size="18" /> Workflows</h2>
        <a-button type="primary" @click="openWorkflowModal('create')">
          <template #icon><Plus :size="14" /></template>Add Workflow
        </a-button>
      </div>
      <a-table :columns="workflowColumns" :data-source="workflows" :loading="loading" row-key="id" size="middle" :pagination="{ pageSize: 20 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'code'"><code class="text-xs bg-gray-100 px-2 py-0.5 rounded">{{ record.code }}</code></template>
          <template v-else-if="column.key === 'states'"><a-badge :count="record.states?.length || 0" :number-style="{ backgroundColor: '#1890ff' }" /></template>
          <template v-else-if="column.key === 'active'"><a-tag :color="record.is_active ? 'green' : 'default'">{{ record.is_active ? 'Yes' : 'No' }}</a-tag></template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" @click="openWorkflowModal('edit', record)"><Edit3 :size="14" /></a-button>
              <a-button size="small" danger @click="handleDeleteWorkflow(record)"><Trash2 :size="14" /></a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- FLOWS SECTION -->
    <div v-else-if="activeSection === 'flows'">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold flex items-center gap-2 m-0"><GitMerge :size="18" /> Flows</h2>
        <a-button type="primary" @click="openFlowModal('create')">
          <template #icon><Plus :size="14" /></template>Add Flow
        </a-button>
      </div>
      <a-table :columns="flowColumns" :data-source="flows" :loading="loading" row-key="id" size="middle" :pagination="{ pageSize: 20 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'code'"><code class="text-xs bg-gray-100 px-2 py-0.5 rounded">{{ record.code }}</code></template>
          <template v-else-if="column.key === 'trigger'"><a-tag :color="triggerColors[record.trigger_type] || 'default'">{{ record.trigger_type }}</a-tag></template>
          <template v-else-if="column.key === 'status'"><a-tag :color="statusColors[record.status] || 'default'">{{ record.status }}</a-tag></template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button v-if="record.status !== 'active'" size="small" @click="handleActivateFlow(record)" title="Activate"><Play :size="14" /></a-button>
              <a-button v-else size="small" @click="handleDeactivateFlow(record)" title="Deactivate"><Pause :size="14" /></a-button>
              <a-button size="small" @click="handleCloneFlow(record)" title="Clone"><Copy :size="14" /></a-button>
              <a-button size="small" @click="openFlowModal('edit', record)"><Edit3 :size="14" /></a-button>
              <a-button size="small" danger @click="handleDeleteFlow(record)"><Trash2 :size="14" /></a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- BUSINESS RULES SECTION -->
    <div v-else-if="activeSection === 'business-rules'">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold flex items-center gap-2 m-0"><BookOpen :size="18" /> Business Rules</h2>
        <a-button type="primary" @click="openRuleModal('create')">
          <template #icon><Plus :size="14" /></template>Add Rule
        </a-button>
      </div>
      <a-table :columns="ruleColumns" :data-source="rules" :loading="loading" row-key="id" size="middle" :pagination="{ pageSize: 20 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'trigger'"><a-tag :color="triggerOnColors[record.trigger_on] || 'default'">{{ record.trigger_on }}</a-tag></template>
          <template v-else-if="column.key === 'active'">
            <a-switch :checked="record.is_active" size="small" @change="handleToggleRule(record)" />
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" @click="openRuleModal('edit', record)"><Edit3 :size="14" /></a-button>
              <a-button size="small" danger @click="handleDeleteRule(record)"><Trash2 :size="14" /></a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- APPROVALS SECTION -->
    <div v-else-if="activeSection === 'approvals'">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold flex items-center gap-2 m-0"><CheckCircle :size="18" /> Approval Chains</h2>
        <a-button type="primary" @click="openApprovalModal('create')">
          <template #icon><Plus :size="14" /></template>Add Chain
        </a-button>
      </div>
      <a-table :columns="approvalColumns" :data-source="approvals" :loading="loading" row-key="id" size="middle" :pagination="{ pageSize: 20 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'chainType'"><a-tag :color="chainTypeColors[record.chain_type] || 'default'">{{ record.chain_type }}</a-tag></template>
          <template v-else-if="column.key === 'steps'"><a-badge :count="record.steps?.length || 0" :number-style="{ backgroundColor: '#1890ff' }" /></template>
          <template v-else-if="column.key === 'active'"><a-tag :color="record.is_active ? 'green' : 'default'">{{ record.is_active ? 'Yes' : 'No' }}</a-tag></template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button size="small" @click="openApprovalModal('edit', record)"><Edit3 :size="14" /></a-button>
              <a-button size="small" danger @click="handleDeleteApproval(record)"><Trash2 :size="14" /></a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- SCHEDULED SECTION (placeholder) -->
    <div v-else-if="activeSection === 'scheduled'">
      <a-card>
        <a-result status="info" title="Scheduled Actions" sub-title="Scheduled cron-based automation actions will be available in a future update.">
          <template #extra>
            <a-button disabled><Clock :size="14" class="mr-1" /> Coming Soon</a-button>
          </template>
        </a-result>
      </a-card>
    </div>

    <!-- WORKFLOW MODAL -->
    <a-modal v-model:open="showWorkflowModal" :title="workflowFormMode === 'create' ? 'Create Workflow' : 'Edit Workflow'" width="720px" @ok="handleWorkflowSubmit" :confirm-loading="workflowFormLoading">
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="Code"><a-input v-model:value="workflowForm.code" placeholder="e.g. leave_approval" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="Name"><a-input v-model:value="workflowForm.name" placeholder="Workflow name" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="Description"><a-textarea v-model:value="workflowForm.description" :rows="2" placeholder="Description" /></a-form-item>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Model">
              <a-select v-model:value="workflowForm.model_name" placeholder="Select model" style="width:100%">
                <a-select-option v-for="m in modelOptions" :key="m.value" :value="m.value">{{ m.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8"><a-form-item label="State Field"><a-input v-model:value="workflowForm.state_field" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="Default State"><a-input v-model:value="workflowForm.default_state" placeholder="e.g. draft" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="Active"><a-switch v-model:checked="workflowForm.is_active" /></a-form-item>

        <!-- States -->
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium">States</span>
            <a-button size="small" @click="addState"><Plus :size="12" /> Add</a-button>
          </div>
          <div v-for="(s, i) in workflowForm.states" :key="i" class="flex gap-2 mb-2 items-center">
            <a-input v-model:value="s.code" placeholder="Code" style="width:100px" size="small" />
            <a-input v-model:value="s.name" placeholder="Name" style="width:120px" size="small" />
            <a-input-number v-model:value="s.sequence" placeholder="Seq" style="width:70px" size="small" />
            <a-input v-model:value="s.color" placeholder="#hex" style="width:80px" size="small" />
            <a-checkbox v-model:checked="s.is_start">Start</a-checkbox>
            <a-checkbox v-model:checked="s.is_end">End</a-checkbox>
            <a-button size="small" danger @click="removeState(i)"><Trash2 :size="12" /></a-button>
          </div>
        </div>

        <!-- Transitions -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium">Transitions</span>
            <a-button size="small" @click="addTransition"><Plus :size="12" /> Add</a-button>
          </div>
          <div v-for="(t, i) in workflowForm.transitions" :key="i" class="flex gap-2 mb-2 items-center">
            <a-input v-model:value="t.from_state" placeholder="From" style="width:100px" size="small" />
            <a-input v-model:value="t.to_state" placeholder="To" style="width:100px" size="small" />
            <a-input v-model:value="t.name" placeholder="Name" style="width:120px" size="small" />
            <a-input v-model:value="t.code" placeholder="Code" style="width:100px" size="small" />
            <a-checkbox v-model:checked="t.requires_approval">Approval</a-checkbox>
            <a-button size="small" danger @click="removeTransition(i)"><Trash2 :size="12" /></a-button>
          </div>
        </div>
      </a-form>
    </a-modal>

    <!-- FLOW MODAL -->
    <a-modal v-model:open="showFlowModal" :title="flowFormMode === 'create' ? 'Create Flow' : 'Edit Flow'" @ok="handleFlowSubmit" :confirm-loading="flowFormLoading">
      <a-form layout="vertical">
        <a-form-item label="Name"><a-input v-model:value="flowForm.name" placeholder="Flow name" /></a-form-item>
        <a-form-item label="Code"><a-input v-model:value="flowForm.code" placeholder="e.g. auto_assign" /></a-form-item>
        <a-form-item label="Description"><a-textarea v-model:value="flowForm.description" :rows="2" /></a-form-item>
        <a-form-item label="Trigger Type">
          <a-select v-model:value="flowForm.trigger_type" style="width:100%">
            <a-select-option value="record">Record Change</a-select-option>
            <a-select-option value="schedule">Scheduled</a-select-option>
            <a-select-option value="manual">Manual</a-select-option>
            <a-select-option value="api">API Call</a-select-option>
            <a-select-option value="subflow">Subflow</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- BUSINESS RULE MODAL -->
    <a-modal v-model:open="showRuleModal" :title="ruleFormMode === 'create' ? 'Create Business Rule' : 'Edit Business Rule'" width="680px" @ok="handleRuleSubmit" :confirm-loading="ruleFormLoading">
      <a-form layout="vertical">
        <a-form-item label="Name"><a-input v-model:value="ruleForm.name" placeholder="Rule name" /></a-form-item>
        <a-row :gutter="16">
          <a-col :span="8"><a-form-item label="Entity Type"><a-input v-model:value="ruleForm.entity_type" placeholder="e.g. hr.leave" /></a-form-item></a-col>
          <a-col :span="8">
            <a-form-item label="Trigger On">
              <a-select v-model:value="ruleForm.trigger_on" style="width:100%">
                <a-select-option value="INSERT">INSERT</a-select-option>
                <a-select-option value="UPDATE">UPDATE</a-select-option>
                <a-select-option value="DELETE">DELETE</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8"><a-form-item label="Priority"><a-input-number v-model:value="ruleForm.priority" :min="0" style="width:100%" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="Active"><a-switch v-model:checked="ruleForm.is_active" /></a-form-item>

        <!-- Conditions -->
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium">Conditions</span>
            <a-button size="small" @click="addCondition"><Plus :size="12" /> Add</a-button>
          </div>
          <div v-for="(c, i) in ruleForm.conditions" :key="i" class="flex gap-2 mb-2 items-center">
            <a-input v-model:value="c.field" placeholder="Field" style="width:140px" size="small" />
            <a-select v-model:value="c.operator" style="width:130px" size="small">
              <a-select-option v-for="op in operatorOptions" :key="op.value" :value="op.value">{{ op.label }}</a-select-option>
            </a-select>
            <a-input v-model:value="c.value" placeholder="Value" style="width:140px" size="small" />
            <a-button size="small" danger @click="removeCondition(i)"><Trash2 :size="12" /></a-button>
          </div>
        </div>

        <!-- Actions -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium">Actions</span>
            <a-button size="small" @click="addAction"><Plus :size="12" /> Add</a-button>
          </div>
          <div v-for="(a, i) in ruleForm.actions" :key="i" class="flex gap-2 mb-2 items-center">
            <a-select v-model:value="a.action_type" style="width:160px" size="small">
              <a-select-option v-for="at in actionTypeOptions" :key="at.value" :value="at.value">{{ at.label }}</a-select-option>
            </a-select>
            <a-button size="small" danger @click="removeAction(i)"><Trash2 :size="12" /></a-button>
          </div>
        </div>
      </a-form>
    </a-modal>

    <!-- APPROVAL CHAIN MODAL -->
    <a-modal v-model:open="showApprovalModal" :title="approvalFormMode === 'create' ? 'Create Approval Chain' : 'Edit Approval Chain'" width="680px" @ok="handleApprovalSubmit" :confirm-loading="approvalFormLoading">
      <a-form layout="vertical">
        <a-form-item label="Name"><a-input v-model:value="approvalForm.name" placeholder="Chain name" /></a-form-item>
        <a-form-item label="Description"><a-textarea v-model:value="approvalForm.description" :rows="2" /></a-form-item>
        <a-form-item label="Chain Type">
          <a-radio-group v-model:value="approvalForm.chain_type">
            <a-radio-button value="SEQUENTIAL">Sequential</a-radio-button>
            <a-radio-button value="PARALLEL">Parallel</a-radio-button>
            <a-radio-button value="ANY_ONE">Any One</a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="Active"><a-switch v-model:checked="approvalForm.is_active" /></a-form-item>

        <!-- Steps -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium">Approval Steps</span>
            <a-button size="small" @click="addStep"><Plus :size="12" /> Add</a-button>
          </div>
          <div v-for="(s, i) in approvalForm.steps" :key="i" class="flex gap-2 mb-2 items-center">
            <a-input-number v-model:value="s.sequence" placeholder="#" style="width:60px" size="small" :min="1" />
            <a-select v-model:value="s.approver_type" style="width:100px" size="small">
              <a-select-option value="USER">User</a-select-option>
              <a-select-option value="GROUP">Group</a-select-option>
              <a-select-option value="ROLE">Role</a-select-option>
            </a-select>
            <a-input v-model:value="s.approver_id" placeholder="Approver ID" style="width:120px" size="small" />
            <a-checkbox v-model:checked="s.required">Required</a-checkbox>
            <a-input-number v-model:value="s.escalation_days" placeholder="Esc. days" style="width:90px" size="small" :min="0" />
            <a-button size="small" danger @click="removeStep(i)"><Trash2 :size="12" /></a-button>
          </div>
        </div>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.automation-page { min-height: 100%; }
</style>
