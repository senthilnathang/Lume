<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  Webhook,
  Plus,
  RefreshCw,
  Search,
  Edit3,
  Trash2,
  ScrollText,
} from 'lucide-vue-next';

import {
  getWebhooks,
  getWebhook,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhookLogs,
} from '@modules/advanced_features/static/api/index';

defineOptions({ name: 'WebhooksView' });

interface WebhookItem {
  id: number;
  name: string;
  url: string;
  events?: any[];
  headers?: any;
  secret?: string;
  model?: string;
  retryCount?: number;
  retry_count?: number;
  status: string;
  lastTriggeredAt?: string;
  last_triggered_at?: string;
  lastStatus?: string;
  last_status?: string;
  createdAt?: string;
  created_at?: string;
}

interface WebhookLog {
  id: number;
  event?: string;
  status?: string;
  responseStatus?: string;
  response_status?: string;
  duration?: number;
  createdAt?: string;
  created_at?: string;
}

// State
const loading = ref(false);
const webhooks = ref<WebhookItem[]>([]);
const searchQuery = ref('');
const statusFilter = ref<string | undefined>(undefined);
const modelFilter = ref<string | undefined>(undefined);

// Form drawer
const showFormDrawer = ref(false);
const formLoading = ref(false);
const editingId = ref<number | null>(null);
const form = ref({
  name: '',
  url: '',
  events: '[]',
  headers: '{}',
  secret: '',
  model: '',
  retryCount: 3,
  status: 'active',
});

// Logs drawer
const showLogsDrawer = ref(false);
const logsLoading = ref(false);
const webhookLogs = ref<WebhookLog[]>([]);
const logsWebhookName = ref('');

// Computed
const models = computed(() => {
  const set = new Set(webhooks.value.map((w) => w.model).filter(Boolean));
  return Array.from(set).sort();
});

const filteredWebhooks = computed(() => {
  let result = webhooks.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (w) =>
        w.name?.toLowerCase().includes(q) ||
        w.url?.toLowerCase().includes(q) ||
        w.model?.toLowerCase().includes(q),
    );
  }
  if (statusFilter.value) {
    result = result.filter((w) => w.status === statusFilter.value);
  }
  if (modelFilter.value) {
    result = result.filter((w) => w.model === modelFilter.value);
  }
  return result;
});

const totalCount = computed(() => webhooks.value.length);
const activeCount = computed(() => webhooks.value.filter((w) => w.status === 'active').length);
const inactiveCount = computed(() => webhooks.value.filter((w) => w.status === 'inactive').length);
const errorCount = computed(() => webhooks.value.filter((w) => w.status === 'error').length);

// Table columns
const columns = [
  { title: 'Name', key: 'name', width: 180 },
  { title: 'URL', key: 'url', ellipsis: true },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Events', key: 'events', width: 120 },
  { title: 'Last Triggered', key: 'lastTriggered', width: 140 },
  { title: 'Last Status', key: 'lastStatus', width: 110 },
  { title: 'Actions', key: 'actions', width: 140, fixed: 'right' },
];

const logColumns = [
  { title: 'Event', dataIndex: 'event', key: 'event', width: 140 },
  { title: 'Status', key: 'logStatus', width: 100 },
  { title: 'Response', key: 'response', width: 100 },
  { title: 'Duration', key: 'duration', width: 100 },
  { title: 'Time', key: 'logTime', width: 160 },
];

const statusColors: Record<string, string> = {
  active: 'green',
  inactive: 'default',
  error: 'red',
};

const logStatusColors: Record<string, string> = {
  success: 'green',
  failed: 'red',
  pending: 'orange',
};

// Methods
async function loadData() {
  loading.value = true;
  try {
    const res = await getWebhooks();
    webhooks.value = Array.isArray(res) ? res : res?.data || [];
  } catch (error) {
    message.error('Failed to load webhooks');
    console.error('Failed to load webhooks:', error);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  form.value = {
    name: '',
    url: '',
    events: '[]',
    headers: '{}',
    secret: '',
    model: '',
    retryCount: 3,
    status: 'active',
  };
  showFormDrawer.value = true;
}

async function openEdit(record: any) {
  editingId.value = record.id;
  formLoading.value = true;
  showFormDrawer.value = true;
  try {
    const detail = await getWebhook(record.id);
    const w = detail || record;
    form.value = {
      name: w.name || '',
      url: w.url || '',
      events: JSON.stringify(w.events || [], null, 2),
      headers: JSON.stringify(w.headers || {}, null, 2),
      secret: w.secret || '',
      model: w.model || '',
      retryCount: w.retryCount ?? w.retry_count ?? 3,
      status: w.status || 'active',
    };
  } catch {
    form.value = {
      name: record.name || '',
      url: record.url || '',
      events: JSON.stringify(record.events || [], null, 2),
      headers: JSON.stringify(record.headers || {}, null, 2),
      secret: record.secret || '',
      model: record.model || '',
      retryCount: record.retryCount ?? record.retry_count ?? 3,
      status: record.status || 'active',
    };
  } finally {
    formLoading.value = false;
  }
}

async function handleSave() {
  if (!form.value.name || !form.value.url) {
    message.warning('Name and URL are required');
    return;
  }

  let events, headers;
  try {
    events = JSON.parse(form.value.events);
  } catch {
    message.error('Events must be valid JSON');
    return;
  }
  try {
    headers = JSON.parse(form.value.headers);
  } catch {
    message.error('Headers must be valid JSON');
    return;
  }

  const payload = {
    name: form.value.name,
    url: form.value.url,
    events,
    headers,
    secret: form.value.secret || null,
    model: form.value.model || null,
    retryCount: form.value.retryCount,
    status: form.value.status,
  };

  formLoading.value = true;
  try {
    if (editingId.value) {
      await updateWebhook(editingId.value, payload);
      message.success('Webhook updated');
    } else {
      await createWebhook(payload);
      message.success('Webhook created');
    }
    showFormDrawer.value = false;
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Failed to save webhook');
  } finally {
    formLoading.value = false;
  }
}

function confirmDelete(record: any) {
  Modal.confirm({
    title: 'Delete Webhook',
    content: `Are you sure you want to delete "${record.name}"? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        await deleteWebhook(record.id);
        message.success('Webhook deleted');
        await loadData();
      } catch (error: any) {
        message.error(error?.message || 'Failed to delete webhook');
      }
    },
  });
}

async function openLogs(record: any) {
  logsWebhookName.value = record.name;
  logsLoading.value = true;
  showLogsDrawer.value = true;
  webhookLogs.value = [];
  try {
    const res = await getWebhookLogs(record.id, 50);
    webhookLogs.value = Array.isArray(res) ? res : res?.data || [];
  } catch (error) {
    message.error('Failed to load webhook logs');
    console.error('Failed to load webhook logs:', error);
  } finally {
    logsLoading.value = false;
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateStr: string) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="webhooks-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <Webhook :size="24" />
          Webhooks
        </h1>
        <p class="text-gray-500 m-0">Manage outgoing webhook integrations</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          Add Webhook
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ totalCount }}</div>
            <div class="text-gray-500 text-sm">Total</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ activeCount }}</div>
            <div class="text-gray-500 text-sm">Active</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-400">{{ inactiveCount }}</div>
            <div class="text-gray-500 text-sm">Inactive</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-red-500">{{ errorCount }}</div>
            <div class="text-gray-500 text-sm">Errors</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="8">
          <a-input v-model:value="searchQuery" placeholder="Search webhooks..." allow-clear>
            <template #prefix><Search :size="14" class="text-gray-400" /></template>
          </a-input>
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-select v-model:value="statusFilter" placeholder="Filter by status" allow-clear style="width: 100%">
            <a-select-option value="active">Active</a-select-option>
            <a-select-option value="inactive">Inactive</a-select-option>
            <a-select-option value="error">Error</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-select v-model:value="modelFilter" placeholder="Filter by model" allow-clear style="width: 100%">
            <a-select-option v-for="m in models" :key="m" :value="m">{{ m }}</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="filteredWebhooks"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <span class="font-medium">{{ record.name }}</span>
          </template>

          <template v-else-if="column.key === 'url'">
            <a-tooltip :title="record.url">
              <code class="text-xs bg-gray-50 px-1.5 py-0.5 rounded">{{ record.url }}</code>
            </a-tooltip>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColors[record.status] || 'default'">
              {{ record.status }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'events'">
            <span class="text-sm text-gray-600">
              {{ Array.isArray(record.events) ? record.events.length : 0 }} event(s)
            </span>
          </template>

          <template v-else-if="column.key === 'lastTriggered'">
            <a-tooltip :title="formatDate(record.lastTriggeredAt || record.last_triggered_at)">
              <span class="text-sm">{{ formatRelativeTime(record.lastTriggeredAt || record.last_triggered_at) }}</span>
            </a-tooltip>
          </template>

          <template v-else-if="column.key === 'lastStatus'">
            <a-tag v-if="record.lastStatus || record.last_status" :color="logStatusColors[record.lastStatus || record.last_status] || 'default'">
              {{ record.lastStatus || record.last_status }}
            </a-tag>
            <span v-else class="text-gray-400">-</span>
          </template>

          <template v-else-if="column.key === 'actions'">
            <div class="flex items-center gap-1">
              <a-tooltip title="View Logs">
                <a-button type="text" size="small" @click="openLogs(record)">
                  <ScrollText :size="16" />
                </a-button>
              </a-tooltip>
              <a-tooltip title="Edit">
                <a-button type="text" size="small" @click="openEdit(record)">
                  <Edit3 :size="16" />
                </a-button>
              </a-tooltip>
              <a-tooltip title="Delete">
                <a-button type="text" size="small" danger @click="confirmDelete(record)">
                  <Trash2 :size="16" />
                </a-button>
              </a-tooltip>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Drawer -->
    <a-drawer
      v-model:open="showFormDrawer"
      :title="editingId ? 'Edit Webhook' : 'Create Webhook'"
      width="520"
      placement="right"
      :footer-style="{ textAlign: 'right' }"
    >
      <a-spin :spinning="formLoading">
        <a-form layout="vertical">
          <a-form-item label="Name" required>
            <a-input v-model:value="form.name" placeholder="e.g. Order Notification" />
          </a-form-item>

          <a-form-item label="URL" required>
            <a-input v-model:value="form.url" placeholder="https://example.com/webhook" />
          </a-form-item>

          <a-form-item label="Events (JSON array)">
            <a-textarea v-model:value="form.events" :rows="3" placeholder='["order.created", "order.updated"]' />
          </a-form-item>

          <a-form-item label="Headers (JSON object)">
            <a-textarea v-model:value="form.headers" :rows="3" placeholder='{"X-Custom-Header": "value"}' />
          </a-form-item>

          <a-form-item label="Secret">
            <a-input-password v-model:value="form.secret" placeholder="Webhook signing secret (optional)" />
          </a-form-item>

          <a-form-item label="Model">
            <a-input v-model:value="form.model" placeholder="e.g. Order, User (optional)" />
          </a-form-item>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="Retry Count">
                <a-input-number v-model:value="form.retryCount" :min="0" :max="10" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="Status">
                <a-select v-model:value="form.status" style="width: 100%">
                  <a-select-option value="active">Active</a-select-option>
                  <a-select-option value="inactive">Inactive</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </a-spin>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <a-button @click="showFormDrawer = false">Cancel</a-button>
          <a-button type="primary" :loading="formLoading" @click="handleSave">
            {{ editingId ? 'Update' : 'Create' }}
          </a-button>
        </div>
      </template>
    </a-drawer>

    <!-- Logs Drawer -->
    <a-drawer
      v-model:open="showLogsDrawer"
      :title="`Webhook Logs: ${logsWebhookName}`"
      width="640"
      placement="right"
    >
      <a-spin :spinning="logsLoading">
        <a-empty v-if="!webhookLogs.length && !logsLoading" description="No logs found" />
        <a-table
          v-else
          :columns="logColumns"
          :data-source="webhookLogs"
          :loading="logsLoading"
          :pagination="{ pageSize: 20 }"
          row-key="id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'logStatus'">
              <a-tag :color="logStatusColors[record.status] || 'default'">
                {{ record.status }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'response'">
              <code class="text-xs">{{ record.responseStatus || record.response_status || '-' }}</code>
            </template>
            <template v-else-if="column.key === 'duration'">
              <span class="text-sm">{{ record.duration ? `${record.duration}ms` : '-' }}</span>
            </template>
            <template v-else-if="column.key === 'logTime'">
              <span class="text-sm">{{ formatDate(record.createdAt || record.created_at) }}</span>
            </template>
          </template>
        </a-table>
      </a-spin>
    </a-drawer>
  </div>
</template>

<style scoped>
.webhooks-page {
  min-height: 100%;
}

.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
