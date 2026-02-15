<script lang="ts" setup>
import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import {
  Shield, Lock, Smartphone, Plus, RefreshCw,
  Trash2, AlertTriangle, Copy, XCircle,
} from 'lucide-vue-next';
import {
  getApiKeys, createApiKey, revokeApiKey,
  getIpAccessRules, createIpAccessRule, updateIpAccessRule, deleteIpAccessRule,
  getSessions, revokeSession,
  type ApiKey, type Session, type IpAccessRule,
} from '@modules/base_security/static/api/index';

defineOptions({ name: 'SecurityView' });

const route = useRoute();
const router = useRouter();

const sections = [
  { label: 'Access Control', value: 'access' },
  { label: 'Two-Factor', value: '2fa' },
  { label: 'Sessions', value: 'sessions' },
  { label: 'API Keys', value: 'api-keys' },
];

const activeSection = computed({
  get: () => {
    const seg = route.path.split('/').pop() || 'access';
    return sections.some((s) => s.value === seg) ? seg : 'access';
  },
  set: () => {},
});

// State
const loading = ref(false);
const ipRules = ref<IpAccessRule[]>([]);
const sessions_ = ref<Session[]>([]);
const apiKeys = ref<ApiKey[]>([]);

// IP Access Modal
const showIpModal = ref(false);
const ipFormMode = ref<'create' | 'edit'>('create');
const ipFormLoading = ref(false);
const editingRule = ref<IpAccessRule | null>(null);
const ipForm = reactive({ ipAddress: '', description: '', type: 'whitelist' as IpAccessRule['type'] });

// API Key Modal
const showKeyModal = ref(false);
const keyFormLoading = ref(false);
const keyForm = reactive({ name: '', scopes: [] as string[] });
const newKeyValue = ref('');
const showNewKey = ref(false);

// Table columns
const ipColumns: ColumnsType = [
  { title: 'IP Address', dataIndex: 'ipAddress', key: 'ipAddress', width: 160 },
  { title: 'Description', dataIndex: 'description', key: 'description' },
  { title: 'Type', key: 'type', width: 110 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Created', key: 'created', width: 130 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

const sessionColumns: ColumnsType = [
  { title: 'IP Address', dataIndex: 'ipAddress', key: 'ipAddress', width: 140 },
  { title: 'User Agent', key: 'userAgent' },
  { title: 'Last Activity', key: 'lastActivity', width: 140 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Created', key: 'created', width: 130 },
  { title: 'Actions', key: 'actions', width: 90, fixed: 'right' },
];

const apiKeyColumns: ColumnsType = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 150 },
  { title: 'Prefix', key: 'prefix', width: 100 },
  { title: 'Status', key: 'status', width: 90 },
  { title: 'Scopes', key: 'scopes' },
  { title: 'Last Used', key: 'lastUsed', width: 130 },
  { title: 'Expires', key: 'expires', width: 130 },
  { title: 'Actions', key: 'actions', width: 90, fixed: 'right' },
];

// Methods
async function loadData() {
  loading.value = true;
  try {
    switch (activeSection.value) {
      case 'access': await loadIpRules(); break;
      case 'sessions': await loadSessions(); break;
      case 'api-keys': await loadApiKeys(); break;
      case '2fa': break;
    }
  } finally {
    loading.value = false;
  }
}

async function loadIpRules() {
  try {
    const res = await getIpAccessRules();
    ipRules.value = Array.isArray(res) ? res : (res as any)?.data || [];
  } catch { ipRules.value = []; }
}

async function loadSessions() {
  try {
    const res = await getSessions();
    sessions_.value = Array.isArray(res) ? res : (res as any)?.data || [];
  } catch { sessions_.value = []; }
}

async function loadApiKeys() {
  try {
    const res = await getApiKeys();
    apiKeys.value = Array.isArray(res) ? res : (res as any)?.data || [];
  } catch { apiKeys.value = []; }
}

function handleSectionChange(val: string) {
  router.push(`/settings/security/${val}`);
}

// IP Access
function openCreateIp() {
  ipFormMode.value = 'create';
  editingRule.value = null;
  Object.assign(ipForm, { ipAddress: '', description: '', type: 'whitelist' });
  showIpModal.value = true;
}

function openEditIp(rule: IpAccessRule) {
  ipFormMode.value = 'edit';
  editingRule.value = rule;
  Object.assign(ipForm, { ipAddress: rule.ipAddress, description: rule.description || '', type: rule.type });
  showIpModal.value = true;
}

async function handleIpSubmit() {
  if (!ipForm.ipAddress) { message.warning('IP address is required'); return; }
  ipFormLoading.value = true;
  try {
    if (ipFormMode.value === 'create') {
      await createIpAccessRule(ipForm);
      message.success('IP access rule created');
    } else if (editingRule.value) {
      await updateIpAccessRule(editingRule.value.id, ipForm);
      message.success('IP access rule updated');
    }
    showIpModal.value = false;
    await loadIpRules();
  } catch (error: any) {
    message.error(error?.message || 'Operation failed');
  } finally {
    ipFormLoading.value = false;
  }
}

function handleDeleteIp(rule: IpAccessRule) {
  Modal.confirm({
    title: 'Delete IP Rule',
    content: `Remove access rule for ${rule.ipAddress}?`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Delete', okType: 'danger',
    async onOk() {
      try {
        await deleteIpAccessRule(rule.id);
        message.success('IP rule deleted');
        await loadIpRules();
      } catch (error: any) {
        message.error(error?.message || 'Failed to delete');
      }
    },
  });
}

// Sessions
function handleRevokeSession(session: Session) {
  Modal.confirm({
    title: 'Revoke Session',
    content: `Revoke session from ${session.ipAddress || 'unknown IP'}?`,
    icon: h(AlertTriangle, { size: 20, class: 'text-orange-500 mr-2' }),
    okText: 'Revoke', okType: 'danger',
    async onOk() {
      try {
        await revokeSession(session.id);
        message.success('Session revoked');
        await loadSessions();
      } catch (error: any) {
        message.error(error?.message || 'Failed to revoke');
      }
    },
  });
}

// API Keys
function openCreateKey() {
  Object.assign(keyForm, { name: '', scopes: [] });
  newKeyValue.value = '';
  showNewKey.value = false;
  showKeyModal.value = true;
}

async function handleKeySubmit() {
  if (!keyForm.name) { message.warning('Name is required'); return; }
  keyFormLoading.value = true;
  try {
    const res = await createApiKey({ name: keyForm.name, scopes: keyForm.scopes });
    if (res?.key) {
      newKeyValue.value = res.key;
      showNewKey.value = true;
    }
    message.success('API key created');
    await loadApiKeys();
  } catch (error: any) {
    message.error(error?.message || 'Failed to create key');
  } finally {
    keyFormLoading.value = false;
  }
}

function handleRevokeKey(key: ApiKey) {
  Modal.confirm({
    title: 'Revoke API Key',
    content: `Revoke "${key.name}"? This cannot be undone.`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Revoke', okType: 'danger',
    async onOk() {
      try {
        await revokeApiKey(key.id);
        message.success('API key revoked');
        await loadApiKeys();
      } catch (error: any) {
        message.error(error?.message || 'Failed to revoke');
      }
    },
  });
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  message.success('Copied to clipboard');
}

function formatRelativeTime(dateStr?: string | null) {
  if (!dateStr) return '-';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

watch(() => route.path, () => { loadData(); });
onMounted(() => { loadData(); });
</script>

<template>
  <div class="security-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <Shield :size="24" />
          Security
        </h1>
        <p class="text-gray-500 m-0">Manage security settings and access controls</p>
      </div>
      <a-button @click="loadData" :loading="loading">
        <template #icon><RefreshCw :size="14" /></template>
        Refresh
      </a-button>
    </div>

    <!-- Section Navigation -->
    <a-segmented :value="activeSection" :options="sections" class="mb-6" @change="handleSectionChange" />

    <!-- Access Control -->
    <div v-if="activeSection === 'access'">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold m-0">IP Access Rules</h2>
        <a-button type="primary" @click="openCreateIp">
          <template #icon><Plus :size="14" /></template>
          Add Rule
        </a-button>
      </div>
      <a-card>
        <a-table :columns="ipColumns" :data-source="ipRules" :loading="loading" :pagination="false" row-key="id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'type'">
              <a-tag :color="(record as IpAccessRule).type === 'whitelist' ? 'green' : 'red'">
                {{ (record as IpAccessRule).type }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-badge :status="(record as IpAccessRule).status === 'active' ? 'success' : 'default'" :text="(record as IpAccessRule).status" />
            </template>
            <template v-else-if="column.key === 'created'">
              {{ formatDate((record as IpAccessRule).createdAt) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="actions-cell flex items-center gap-1">
                <a-tooltip title="Edit">
                  <a-button type="text" size="small" @click="openEditIp(record as IpAccessRule)">
                    <Lock :size="14" />
                  </a-button>
                </a-tooltip>
                <a-popconfirm title="Delete?" ok-text="Delete" ok-type="danger" @confirm="handleDeleteIp(record as IpAccessRule)">
                  <a-tooltip title="Delete">
                    <a-button type="text" size="small" danger>
                      <Trash2 :size="14" />
                    </a-button>
                  </a-tooltip>
                </a-popconfirm>
              </div>
            </template>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- Two-Factor Auth -->
    <div v-if="activeSection === '2fa'">
      <a-card>
        <a-result status="info" title="Two-Factor Authentication" sub-title="2FA adds an extra layer of security to your account">
          <template #extra>
            <a-button type="primary" disabled>
              <template #icon><Smartphone :size="14" /></template>
              Enable 2FA
            </a-button>
            <p class="text-gray-400 text-sm mt-2">Coming soon</p>
          </template>
        </a-result>
      </a-card>
    </div>

    <!-- Sessions -->
    <div v-if="activeSection === 'sessions'">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold m-0">Active Sessions</h2>
      </div>
      <a-card>
        <a-table :columns="sessionColumns" :data-source="sessions_" :loading="loading" :pagination="false" row-key="id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'userAgent'">
              <span class="text-sm" :title="(record as Session).userAgent">
                {{ ((record as Session).userAgent || '-').substring(0, 50) }}{{ ((record as Session).userAgent || '').length > 50 ? '...' : '' }}
              </span>
            </template>
            <template v-else-if="column.key === 'lastActivity'">
              {{ formatRelativeTime((record as Session).lastActivityAt) }}
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="(record as Session).status === 'active' ? 'green' : (record as Session).status === 'revoked' ? 'red' : 'default'">
                {{ (record as Session).status }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'created'">
              {{ formatDate((record as Session).createdAt) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="actions-cell flex items-center gap-1">
                <a-popconfirm
                  v-if="(record as Session).status === 'active'"
                  title="Revoke session?"
                  ok-text="Revoke"
                  ok-type="danger"
                  @confirm="handleRevokeSession(record as Session)"
                >
                  <a-tooltip title="Revoke">
                    <a-button type="text" size="small" danger>
                      <XCircle :size="14" />
                    </a-button>
                  </a-tooltip>
                </a-popconfirm>
              </div>
            </template>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- API Keys -->
    <div v-if="activeSection === 'api-keys'">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold m-0">API Keys</h2>
        <a-button type="primary" @click="openCreateKey">
          <template #icon><Plus :size="14" /></template>
          Generate Key
        </a-button>
      </div>
      <a-card>
        <a-table :columns="apiKeyColumns" :data-source="apiKeys" :loading="loading" :pagination="false" row-key="id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'prefix'">
              <code class="text-xs bg-gray-100 px-2 py-0.5 rounded">{{ (record as ApiKey).prefix }}...</code>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="(record as ApiKey).status === 'active' ? 'green' : (record as ApiKey).status === 'expired' ? 'red' : 'default'">
                {{ (record as ApiKey).status }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'scopes'">
              <template v-if="(record as ApiKey).scopes?.length">
                <a-tag v-for="scope in (record as ApiKey).scopes.slice(0, 3)" :key="scope" size="small">{{ scope }}</a-tag>
                <a-tag v-if="(record as ApiKey).scopes.length > 3" size="small">+{{ (record as ApiKey).scopes.length - 3 }}</a-tag>
              </template>
              <span v-else class="text-gray-300">All</span>
            </template>
            <template v-else-if="column.key === 'lastUsed'">
              {{ formatRelativeTime((record as ApiKey).lastUsedAt) }}
            </template>
            <template v-else-if="column.key === 'expires'">
              {{ formatDate((record as ApiKey).expiresAt) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="actions-cell flex items-center gap-1">
                <a-popconfirm
                  v-if="(record as ApiKey).status === 'active'"
                  title="Revoke key?"
                  ok-text="Revoke"
                  ok-type="danger"
                  @confirm="handleRevokeKey(record as ApiKey)"
                >
                  <a-tooltip title="Revoke">
                    <a-button type="text" size="small" danger>
                      <Trash2 :size="14" />
                    </a-button>
                  </a-tooltip>
                </a-popconfirm>
              </div>
            </template>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- IP Access Modal -->
    <a-modal
      v-model:open="showIpModal"
      :title="ipFormMode === 'create' ? 'Add IP Rule' : 'Edit IP Rule'"
      :confirm-loading="ipFormLoading"
      @ok="handleIpSubmit"
    >
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="IP Address" required>
          <a-input v-model:value="ipForm.ipAddress" placeholder="192.168.1.1" />
        </a-form-item>
        <a-form-item label="Description">
          <a-input v-model:value="ipForm.description" placeholder="Office network" />
        </a-form-item>
        <a-form-item label="Type">
          <a-radio-group v-model:value="ipForm.type">
            <a-radio value="whitelist">Whitelist (Allow)</a-radio>
            <a-radio value="blacklist">Blacklist (Block)</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- API Key Modal -->
    <a-modal
      v-model:open="showKeyModal"
      title="Generate API Key"
      :confirm-loading="keyFormLoading"
      @ok="handleKeySubmit"
      :ok-button-props="{ disabled: showNewKey }"
    >
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="Name" required>
          <a-input v-model:value="keyForm.name" placeholder="My API key" :disabled="showNewKey" />
        </a-form-item>
        <a-form-item label="Scopes">
          <a-select v-model:value="keyForm.scopes" mode="tags" placeholder="Leave empty for all access" style="width: 100%" :disabled="showNewKey" />
        </a-form-item>
      </a-form>
      <a-alert v-if="showNewKey" type="success" class="mt-4" show-icon>
        <template #message>API Key Generated</template>
        <template #description>
          <p class="mb-2">Copy this key now — it won't be shown again:</p>
          <div class="flex items-center gap-2">
            <code class="text-xs bg-green-50 px-3 py-1.5 rounded flex-1 break-all">{{ newKeyValue }}</code>
            <a-button size="small" @click="copyToClipboard(newKeyValue)">
              <Copy :size="14" />
            </a-button>
          </div>
        </template>
      </a-alert>
    </a-modal>
  </div>
</template>

<style scoped>
.security-page { min-height: 100%; }

:deep(.actions-cell .ant-btn) {
  opacity: 0.55;
  transition: opacity 0.15s;
}
:deep(.ant-table-row:hover .actions-cell .ant-btn) {
  opacity: 1;
}
</style>
