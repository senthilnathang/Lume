<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import { Shield, Plus, RefreshCw, Edit3, Trash2, FileText } from 'lucide-vue-next';
import {
  getAccessRules, createAccessRule, updateAccessRule, deleteAccessRule,
  getRbacRoles, type AccessRule, type RbacRole,
} from '@modules/rbac/static/api/access';
import { getAuditLogs, type AuditLog } from '@modules/audit/static/api/index';

defineOptions({ name: 'RbacView' });

const route = useRoute();
const router = useRouter();

const sections = [
  { label: 'Access Rules', value: 'access-rules' },
  { label: 'Audit', value: 'audit' },
];

const activeSection = computed({
  get: () => {
    const seg = route.path.split('/').pop() || 'access-rules';
    return sections.some((s) => s.value === seg) ? seg : 'access-rules';
  },
  set: () => {},
});

function handleSectionChange(val: string) {
  router.push(`/settings/rbac/${val}`);
}

const loading = ref(false);

// ---- Access Rules ----
const accessRules = ref<AccessRule[]>([]);
const rbacRoles = ref<RbacRole[]>([]);
const showRuleModal = ref(false);
const ruleFormMode = ref<'create' | 'edit'>('create');
const ruleFormLoading = ref(false);
const editingRule = ref<AccessRule | null>(null);
const ruleForm = reactive({
  name: '', model: '', roleId: undefined as number | undefined,
  permission: 'read' as AccessRule['permission'], field: '', filter: '',
  isActive: true, priority: 0,
});

const ruleColumns: ColumnsType = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Model', dataIndex: 'model', key: 'model', width: 130 },
  { title: 'Role', key: 'role', width: 130 },
  { title: 'Permission', key: 'permission', width: 110 },
  { title: 'Field', dataIndex: 'field', key: 'field', width: 120 },
  { title: 'Filter', key: 'filter', width: 150, ellipsis: true },
  { title: 'Active', key: 'active', width: 80 },
  { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 80 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

function getRoleName(roleId: number) {
  const role = rbacRoles.value.find((r) => r.id === roleId);
  return role?.name || `Role #${roleId}`;
}

async function loadAccessRules() {
  try {
    const [rulesRes, rolesRes] = await Promise.allSettled([getAccessRules(), getRbacRoles()]);
    if (rulesRes.status === 'fulfilled') {
      const r = rulesRes.value;
      accessRules.value = Array.isArray(r) ? r : (r as any)?.data || [];
    }
    if (rolesRes.status === 'fulfilled') {
      const r = rolesRes.value;
      rbacRoles.value = Array.isArray(r) ? r : (r as any)?.data || [];
    }
  } catch { accessRules.value = []; }
}

function openRuleModal(mode: 'create' | 'edit', rule?: AccessRule) {
  ruleFormMode.value = mode;
  if (mode === 'edit' && rule) {
    editingRule.value = rule;
    Object.assign(ruleForm, {
      name: rule.name, model: rule.model, roleId: rule.roleId,
      permission: rule.permission, field: rule.field || '',
      filter: rule.filter ? JSON.stringify(rule.filter, null, 2) : '',
      isActive: rule.isActive, priority: rule.priority,
    });
  } else {
    editingRule.value = null;
    Object.assign(ruleForm, { name: '', model: '', roleId: undefined, permission: 'read', field: '', filter: '', isActive: true, priority: 0 });
  }
  showRuleModal.value = true;
}

async function handleRuleSubmit() {
  if (!ruleForm.name || !ruleForm.model) { message.warning('Name and Model are required'); return; }
  ruleFormLoading.value = true;
  try {
    let filterObj = undefined;
    if (ruleForm.filter) {
      try { filterObj = JSON.parse(ruleForm.filter); } catch { message.warning('Invalid JSON in filter'); ruleFormLoading.value = false; return; }
    }
    const data = { ...ruleForm, filter: filterObj, field: ruleForm.field || undefined };
    if (ruleFormMode.value === 'edit' && editingRule.value) {
      await updateAccessRule(editingRule.value.id, data);
      message.success('Rule updated');
    } else {
      await createAccessRule(data);
      message.success('Rule created');
    }
    showRuleModal.value = false;
    await loadAccessRules();
  } catch (e: any) { message.error(e?.message || 'Failed'); }
  finally { ruleFormLoading.value = false; }
}

function handleDeleteRule(rule: AccessRule) {
  Modal.confirm({
    title: 'Delete Rule', content: `Delete "${rule.name}"?`, okType: 'danger', okText: 'Delete',
    async onOk() {
      try { await deleteAccessRule(rule.id); message.success('Deleted'); await loadAccessRules(); }
      catch (e: any) { message.error(e?.message || 'Failed'); }
    },
  });
}

// ---- Audit ----
const auditLogs = ref<AuditLog[]>([]);
const showAuditDrawer = ref(false);
const selectedLog = ref<AuditLog | null>(null);

const auditColumns: ColumnsType = [
  { title: 'Time', key: 'time', width: 150 },
  { title: 'User', key: 'user', width: 120 },
  { title: 'Action', key: 'action', width: 100 },
  { title: 'Resource', key: 'resource', width: 150 },
  { title: 'IP Address', dataIndex: 'ip_address', key: 'ip', width: 130 },
  { title: 'Actions', key: 'actions', width: 80, fixed: 'right' },
];

async function loadAuditLogs() {
  try {
    const res = await getAuditLogs({ limit: 100 });
    const all = Array.isArray(res) ? res : (res as any)?.data || [];
    auditLogs.value = all.filter((l: any) =>
      ['role', 'permission', 'access_rule', 'rbac'].some((k) =>
        (l.resource_type || '').toLowerCase().includes(k)
      )
    );
  } catch { auditLogs.value = []; }
}

function viewLog(log: AuditLog) {
  selectedLog.value = log;
  showAuditDrawer.value = true;
}

function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleString();
}

function formatRelativeTime(d?: string) {
  if (!d) return '-';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const actionColors: Record<string, string> = {
  create: 'green', update: 'blue', delete: 'red',
  login: 'cyan', logout: 'default', export: 'purple',
};

// ---- Data loading ----
async function loadData() {
  loading.value = true;
  try {
    if (activeSection.value === 'access-rules') await loadAccessRules();
    else await loadAuditLogs();
  } finally { loading.value = false; }
}

watch(() => route.path, () => { loadData(); });
onMounted(() => { loadData(); });
</script>

<template>
  <div class="rbac-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2"><Shield :size="24" /> Access Control</h1>
        <p class="text-gray-500 m-0">Manage record-level access rules and audit trail</p>
      </div>
      <a-button @click="loadData" :loading="loading">
        <template #icon><RefreshCw :size="14" /></template>Refresh
      </a-button>
    </div>

    <a-segmented v-model:value="activeSection" :options="sections" class="mb-6" @change="handleSectionChange" />

    <!-- ACCESS RULES -->
    <div v-if="activeSection === 'access-rules'">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold m-0">Access Rules</h2>
        <a-button type="primary" @click="openRuleModal('create')">
          <template #icon><Plus :size="14" /></template>Add Rule
        </a-button>
      </div>
      <a-table :columns="ruleColumns" :data-source="accessRules" :loading="loading" row-key="id" size="middle" :pagination="{ pageSize: 20 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'role'">{{ getRoleName(record.roleId) }}</template>
          <template v-else-if="column.key === 'permission'">
            <a-tag :color="record.permission === 'read' ? 'green' : 'orange'">{{ record.permission }}</a-tag>
          </template>
          <template v-else-if="column.key === 'filter'">
            <span v-if="record.filter" class="text-xs text-gray-500">{{ JSON.stringify(record.filter).slice(0, 40) }}...</span>
            <span v-else class="text-gray-300">-</span>
          </template>
          <template v-else-if="column.key === 'active'">
            <a-tag :color="record.isActive ? 'green' : 'default'">{{ record.isActive ? 'Yes' : 'No' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="actions-cell flex items-center gap-1">
              <a-tooltip title="Edit">
                <a-button type="text" size="small" @click="openRuleModal('edit', record)">
                  <template #icon><Edit3 :size="15" /></template>
                </a-button>
              </a-tooltip>
              <a-popconfirm title="Delete this item?" ok-text="Delete" ok-type="danger" @confirm="handleDeleteRule(record)">
                <a-tooltip title="Delete">
                  <a-button type="text" size="small" danger>
                    <template #icon><Trash2 :size="15" /></template>
                  </a-button>
                </a-tooltip>
              </a-popconfirm>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <!-- AUDIT -->
    <div v-else-if="activeSection === 'audit'">
      <h2 class="text-lg font-semibold mb-4">RBAC Audit Trail</h2>
      <a-table :columns="auditColumns" :data-source="auditLogs" :loading="loading" row-key="id" size="middle" :pagination="{ pageSize: 20 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'time'">{{ formatRelativeTime(record.created_at) }}</template>
          <template v-else-if="column.key === 'user'">{{ record.user_id || '-' }}</template>
          <template v-else-if="column.key === 'action'">
            <a-tag :color="actionColors[record.action] || 'default'">{{ record.action }}</a-tag>
          </template>
          <template v-else-if="column.key === 'resource'">{{ record.resource_type || '-' }}</template>
          <template v-else-if="column.key === 'actions'">
            <div class="actions-cell flex items-center gap-1">
              <a-tooltip title="View">
                <a-button type="text" size="small" @click="viewLog(record)">
                  <template #icon><FileText :size="15" /></template>
                </a-button>
              </a-tooltip>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <!-- Rule Modal -->
    <a-modal v-model:open="showRuleModal" :title="ruleFormMode === 'create' ? 'Create Access Rule' : 'Edit Access Rule'" @ok="handleRuleSubmit" :confirm-loading="ruleFormLoading">
      <a-form layout="vertical">
        <a-form-item label="Name"><a-input v-model:value="ruleForm.name" placeholder="Rule name" /></a-form-item>
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="Model"><a-input v-model:value="ruleForm.model" placeholder="e.g. Donation" /></a-form-item></a-col>
          <a-col :span="12">
            <a-form-item label="Role">
              <a-select v-model:value="ruleForm.roleId" placeholder="Select role" style="width:100%">
                <a-select-option v-for="r in rbacRoles" :key="r.id" :value="r.id">{{ r.name }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Permission">
          <a-radio-group v-model:value="ruleForm.permission">
            <a-radio-button value="read">Read</a-radio-button>
            <a-radio-button value="write">Write</a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="Field (optional)"><a-input v-model:value="ruleForm.field" placeholder="Specific field to restrict" /></a-form-item>
        <a-form-item label="Filter (JSON)"><a-textarea v-model:value="ruleForm.filter" :rows="3" placeholder='e.g. { "status": "completed" }' /></a-form-item>
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="Priority"><a-input-number v-model:value="ruleForm.priority" :min="0" style="width:100%" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="Active"><a-switch v-model:checked="ruleForm.isActive" /></a-form-item></a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- Audit Drawer -->
    <a-drawer v-model:open="showAuditDrawer" title="Audit Log Details" :width="500">
      <template v-if="selectedLog">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="Action"><a-tag :color="actionColors[selectedLog.action] || 'default'">{{ selectedLog.action }}</a-tag></a-descriptions-item>
          <a-descriptions-item label="Resource">{{ selectedLog.resource_type || '-' }}</a-descriptions-item>
          <a-descriptions-item label="Record ID">{{ selectedLog.resource_id || '-' }}</a-descriptions-item>
          <a-descriptions-item label="User">{{ selectedLog.user_id || '-' }}</a-descriptions-item>
          <a-descriptions-item label="IP Address">{{ selectedLog.ip_address || '-' }}</a-descriptions-item>
          <a-descriptions-item label="Time">{{ formatDate(selectedLog.created_at) }}</a-descriptions-item>
        </a-descriptions>
        <div v-if="selectedLog.old_data" class="mt-4">
          <h4 class="font-medium mb-2">Old Values</h4>
          <pre class="bg-gray-50 p-3 rounded text-xs overflow-auto">{{ JSON.stringify(selectedLog.old_data, null, 2) }}</pre>
        </div>
        <div v-if="selectedLog.new_data" class="mt-4">
          <h4 class="font-medium mb-2">New Values</h4>
          <pre class="bg-gray-50 p-3 rounded text-xs overflow-auto">{{ JSON.stringify(selectedLog.new_data, null, 2) }}</pre>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
.rbac-page { min-height: 100%; }

:deep(.actions-cell .ant-btn) {
  opacity: 0.55;
  transition: opacity 0.15s;
}
:deep(.ant-table-row:hover .actions-cell .ant-btn) {
  opacity: 1;
}
</style>
