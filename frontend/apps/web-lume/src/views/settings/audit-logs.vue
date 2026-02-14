<script lang="ts" setup>
import { computed, h, onMounted, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import {
  Activity,
  RefreshCw,
  Search,
  Eye,
  Trash2,
  Plus,
  Edit3,
  LogOut,
} from 'lucide-vue-next';

import {
  getAuditLogs,
  getAuditLog,
  cleanupLogs,
  type AuditLog,
} from '@/api/audit';

defineOptions({ name: 'AuditLogsView' });

// State
const loading = ref(false);
const logs = ref<AuditLog[]>([]);
const searchQuery = ref('');
const actionFilter = ref<string | undefined>(undefined);
const resourceFilter = ref<string | undefined>(undefined);
const pagination = ref({ current: 1, pageSize: 50, total: 0 });

// Cleanup modal
const showCleanupModal = ref(false);
const cleanupDays = ref(90);
const cleanupLoading = ref(false);

// View drawer
const showDrawer = ref(false);
const selectedLog = ref<AuditLog | null>(null);
const drawerLoading = ref(false);

// Computed
const resourceTypes = computed(() => {
  const types = new Set(logs.value.map((l) => l.resource_type).filter(Boolean));
  return Array.from(types).sort();
});

const filteredLogs = computed(() => {
  let result = logs.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (l) =>
        l.action?.toLowerCase().includes(q) ||
        l.resource_type?.toLowerCase().includes(q) ||
        l.resource_id?.toLowerCase().includes(q) ||
        l.ip_address?.includes(q),
    );
  }
  if (actionFilter.value) {
    result = result.filter((l) => l.action === actionFilter.value);
  }
  if (resourceFilter.value) {
    result = result.filter((l) => l.resource_type === resourceFilter.value);
  }
  return result;
});

const totalLogs = computed(() => logs.value.length);
const createCount = computed(() => logs.value.filter((l) => l.action === 'CREATE').length);
const updateCount = computed(() => logs.value.filter((l) => l.action === 'UPDATE').length);
const deleteCount = computed(() => logs.value.filter((l) => l.action === 'DELETE').length);

// Table columns
const columns: ColumnsType = [
  { title: 'Time', key: 'time', width: 150 },
  { title: 'User', key: 'user', width: 100 },
  { title: 'Action', key: 'action', width: 110 },
  { title: 'Resource', key: 'resource', width: 200 },
  { title: 'IP Address', key: 'ip', width: 130 },
  { title: 'Actions', key: 'actions', width: 80, fixed: 'right' },
];

const actionColors: Record<string, string> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  LOGIN: 'cyan',
  LOGOUT: 'default',
  READ: 'default',
};

const actionIcons: Record<string, any> = {
  CREATE: Plus,
  UPDATE: Edit3,
  DELETE: Trash2,
  LOGIN: LogOut,
};

// Methods
async function loadData() {
  loading.value = true;
  try {
    const res = await getAuditLogs({
      page: pagination.value.current,
      limit: pagination.value.pageSize,
    });
    if (Array.isArray(res)) {
      logs.value = res;
    } else {
      logs.value = res?.data || [];
      if (res?.meta) {
        pagination.value.total = res.meta.total || 0;
      }
    }
  } catch (error) {
    message.error('Failed to load audit logs');
    console.error('Failed to load audit logs:', error);
  } finally {
    loading.value = false;
  }
}

async function openView(log: AuditLog) {
  drawerLoading.value = true;
  showDrawer.value = true;
  try {
    const detail = await getAuditLog(log.id);
    selectedLog.value = detail;
  } catch {
    selectedLog.value = log;
  } finally {
    drawerLoading.value = false;
  }
}

function openCleanup() {
  cleanupDays.value = 90;
  showCleanupModal.value = true;
}

async function handleCleanup() {
  cleanupLoading.value = true;
  try {
    await cleanupLogs(cleanupDays.value);
    message.success(`Logs older than ${cleanupDays.value} days cleaned up`);
    showCleanupModal.value = false;
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Cleanup failed');
  } finally {
    cleanupLoading.value = false;
  }
}

function getChanges(log: AuditLog) {
  if (!log.old_data && !log.new_data) return [];
  const changes: { field: string; old: any; new: any }[] = [];
  const allKeys = new Set([
    ...Object.keys(log.old_data || {}),
    ...Object.keys(log.new_data || {}),
  ]);
  for (const key of allKeys) {
    const oldVal = log.old_data?.[key];
    const newVal = log.new_data?.[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, old: oldVal, new: newVal });
    }
  }
  return changes;
}

function formatRelativeTime(dateStr?: string | null) {
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

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="audit-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <Activity :size="24" />
          Audit Logs
        </h1>
        <p class="text-gray-500 m-0">Track system changes and user actions</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button danger @click="openCleanup">
          <template #icon><Trash2 :size="14" /></template>
          Cleanup
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ totalLogs }}</div>
            <div class="text-gray-500 text-sm">Total Entries</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ createCount }}</div>
            <div class="text-gray-500 text-sm">Creates</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-500">{{ updateCount }}</div>
            <div class="text-gray-500 text-sm">Updates</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-red-500">{{ deleteCount }}</div>
            <div class="text-gray-500 text-sm">Deletes</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="8">
          <a-input v-model:value="searchQuery" placeholder="Search logs..." allow-clear>
            <template #prefix><Search :size="14" class="text-gray-400" /></template>
          </a-input>
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-select v-model:value="actionFilter" placeholder="Filter by action" allow-clear style="width: 100%">
            <a-select-option value="CREATE">Create</a-select-option>
            <a-select-option value="UPDATE">Update</a-select-option>
            <a-select-option value="DELETE">Delete</a-select-option>
            <a-select-option value="LOGIN">Login</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-select v-model:value="resourceFilter" placeholder="Filter by resource" allow-clear style="width: 100%">
            <a-select-option v-for="rt in resourceTypes" :key="rt" :value="rt">
              {{ rt }}
            </a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="filteredLogs"
        :loading="loading"
        :pagination="{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <!-- Time -->
          <template v-if="column.key === 'time'">
            <a-tooltip :title="formatDate((record as AuditLog).created_at)">
              <span class="text-sm">{{ formatRelativeTime((record as AuditLog).created_at) }}</span>
            </a-tooltip>
          </template>

          <!-- User -->
          <template v-else-if="column.key === 'user'">
            <span class="text-sm text-gray-600">
              {{ (record as AuditLog).user_id ? `User #${(record as AuditLog).user_id}` : 'System' }}
            </span>
          </template>

          <!-- Action -->
          <template v-else-if="column.key === 'action'">
            <a-tag :color="actionColors[(record as AuditLog).action] || 'default'">
              {{ (record as AuditLog).action }}
            </a-tag>
          </template>

          <!-- Resource -->
          <template v-else-if="column.key === 'resource'">
            <div>
              <span class="font-medium text-sm">{{ (record as AuditLog).resource_type }}</span>
              <span v-if="(record as AuditLog).resource_id" class="text-xs text-gray-400 ml-1">
                #{{ (record as AuditLog).resource_id }}
              </span>
            </div>
          </template>

          <!-- IP -->
          <template v-else-if="column.key === 'ip'">
            <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
              {{ (record as AuditLog).ip_address || '-' }}
            </code>
          </template>

          <!-- Actions -->
          <template v-else-if="column.key === 'actions'">
            <a-button type="text" size="small" @click="openView(record as AuditLog)">
              <Eye :size="16" />
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- View Drawer -->
    <a-drawer
      v-model:open="showDrawer"
      title="Audit Log Detail"
      width="560"
      placement="right"
    >
      <a-spin :spinning="drawerLoading">
        <template v-if="selectedLog">
          <div class="mb-6">
            <div class="flex items-center gap-3 mb-4">
              <div
                class="w-12 h-12 rounded-xl flex items-center justify-center"
                :class="{
                  'bg-green-50': selectedLog.action === 'CREATE',
                  'bg-blue-50': selectedLog.action === 'UPDATE',
                  'bg-red-50': selectedLog.action === 'DELETE',
                  'bg-gray-50': !['CREATE', 'UPDATE', 'DELETE'].includes(selectedLog.action),
                }"
              >
                <component
                  :is="actionIcons[selectedLog.action] || Activity"
                  :size="20"
                  :class="{
                    'text-green-500': selectedLog.action === 'CREATE',
                    'text-blue-500': selectedLog.action === 'UPDATE',
                    'text-red-500': selectedLog.action === 'DELETE',
                    'text-gray-500': !['CREATE', 'UPDATE', 'DELETE'].includes(selectedLog.action),
                  }"
                />
              </div>
              <div>
                <div class="font-semibold">
                  {{ selectedLog.action }} {{ selectedLog.resource_type }}
                </div>
                <div class="text-xs text-gray-400">{{ formatDate(selectedLog.created_at) }}</div>
              </div>
            </div>
          </div>

          <a-descriptions :column="1" bordered size="small" class="mb-6">
            <a-descriptions-item label="Action">
              <a-tag :color="actionColors[selectedLog.action] || 'default'">{{ selectedLog.action }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="Resource">
              {{ selectedLog.resource_type }}
              <span v-if="selectedLog.resource_id" class="text-gray-400 ml-1">#{{ selectedLog.resource_id }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="User">
              {{ selectedLog.user_id ? `User #${selectedLog.user_id}` : 'System' }}
            </a-descriptions-item>
            <a-descriptions-item label="IP Address">
              <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{{ selectedLog.ip_address || '-' }}</code>
            </a-descriptions-item>
            <a-descriptions-item label="User Agent">
              <div class="text-xs text-gray-500 break-all">{{ selectedLog.user_agent || '-' }}</div>
            </a-descriptions-item>
            <a-descriptions-item label="Timestamp">
              {{ formatDate(selectedLog.created_at) }}
            </a-descriptions-item>
          </a-descriptions>

          <!-- Changes -->
          <div v-if="getChanges(selectedLog).length > 0" class="mb-6">
            <h3 class="text-sm font-semibold text-gray-500 mb-3">Changes</h3>
            <a-table
              :columns="[
                { title: 'Field', dataIndex: 'field', key: 'field', width: 120 },
                { title: 'Old Value', key: 'old', width: 180 },
                { title: 'New Value', key: 'new', width: 180 },
              ]"
              :data-source="getChanges(selectedLog)"
              :pagination="false"
              size="small"
              row-key="field"
            >
              <template #bodyCell="{ column: col, record: change }">
                <template v-if="col.key === 'old'">
                  <code class="text-xs text-red-500 bg-red-50 px-1 py-0.5 rounded break-all">
                    {{ formatValue(change.old) }}
                  </code>
                </template>
                <template v-else-if="col.key === 'new'">
                  <code class="text-xs text-green-600 bg-green-50 px-1 py-0.5 rounded break-all">
                    {{ formatValue(change.new) }}
                  </code>
                </template>
              </template>
            </a-table>
          </div>

          <!-- Raw Data -->
          <div v-if="selectedLog.metadata" class="mb-6">
            <h3 class="text-sm font-semibold text-gray-500 mb-2">Metadata</h3>
            <pre class="text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-48">{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre>
          </div>
        </template>
      </a-spin>
    </a-drawer>

    <!-- Cleanup Modal -->
    <a-modal
      v-model:open="showCleanupModal"
      title="Cleanup Audit Logs"
      :confirm-loading="cleanupLoading"
      @ok="handleCleanup"
      ok-text="Run Cleanup"
      :ok-button-props="{ danger: true }"
      width="420px"
    >
      <div class="mt-4">
        <a-alert
          type="warning"
          show-icon
          message="This action is irreversible"
          description="Deleted audit logs cannot be recovered. Make sure to export any important records first."
          class="mb-4"
        />
        <a-form-item label="Delete logs older than (days)">
          <a-input-number v-model:value="cleanupDays" :min="7" :max="365" style="width: 100%" />
        </a-form-item>
        <p class="text-sm text-gray-500">
          All audit log entries older than {{ cleanupDays }} days will be permanently deleted.
        </p>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.audit-page {
  min-height: 100%;
}

.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

:deep(.ant-descriptions-item-label) {
  font-weight: 500;
  color: #6b7280;
}
</style>
