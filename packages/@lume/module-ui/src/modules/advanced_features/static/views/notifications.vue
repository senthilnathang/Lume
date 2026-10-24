<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { message } from 'ant-design-vue';
import {
  Bell,
  RefreshCw,
  Search,
  CheckCheck,
  Check,
  X,
} from 'lucide-vue-next';

import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  dismissNotification,
} from '@modules/advanced_features/static/api/index';

defineOptions({ name: 'NotificationsView' });

interface Notification {
  id: number;
  title: string;
  message?: string;
  type: string;
  channel?: string;
  status: string;
  createdAt?: string;
  created_at?: string;
}

// State
const loading = ref(false);
const notifications = ref<Notification[]>([]);
const searchQuery = ref('');
const statusFilter = ref<string | undefined>(undefined);
const typeFilter = ref<string | undefined>(undefined);
const unreadCount = ref(0);

// Computed
const filteredNotifications = computed(() => {
  let result = notifications.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (n) =>
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q),
    );
  }
  if (statusFilter.value) {
    result = result.filter((n) => n.status === statusFilter.value);
  }
  if (typeFilter.value) {
    result = result.filter((n) => n.type === typeFilter.value);
  }
  return result;
});

const totalCount = computed(() => notifications.value.length);
const unreadCountStat = computed(() => notifications.value.filter((n) => n.status === 'unread').length);
const readCount = computed(() => notifications.value.filter((n) => n.status === 'read').length);

// Table columns
const columns = [
  { title: 'Title', key: 'title', width: 200 },
  { title: 'Message', key: 'message', ellipsis: true },
  { title: 'Type', key: 'type', width: 100 },
  { title: 'Channel', key: 'channel', width: 100 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Created At', key: 'createdAt', width: 150 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

const typeColors: Record<string, string> = {
  info: 'blue',
  success: 'green',
  warning: 'orange',
  error: 'red',
  action: 'purple',
};

const statusColors: Record<string, string> = {
  unread: 'orange',
  read: 'green',
  dismissed: 'default',
};

const channelLabels: Record<string, string> = {
  in_app: 'In-App',
  email: 'Email',
  sms: 'SMS',
  push: 'Push',
};

// Methods
async function loadData() {
  loading.value = true;
  try {
    const [notifRes, countRes] = await Promise.all([
      getNotifications(),
      getUnreadCount(),
    ]);
    notifications.value = Array.isArray(notifRes) ? notifRes : notifRes?.data || [];
    unreadCount.value = countRes?.count ?? countRes ?? 0;
  } catch (error) {
    message.error('Failed to load notifications');
    console.error('Failed to load notifications:', error);
  } finally {
    loading.value = false;
  }
}

async function handleMarkRead(record: any) {
  try {
    await markAsRead(record.id);
    message.success('Notification marked as read');
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Failed to mark as read');
  }
}

async function handleMarkAllRead() {
  try {
    await markAllAsRead();
    message.success('All notifications marked as read');
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Failed to mark all as read');
  }
}

async function handleDismiss(record: any) {
  try {
    await dismissNotification(record.id);
    message.success('Notification dismissed');
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Failed to dismiss notification');
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
  <div class="notifications-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <Bell :size="24" />
          Notifications
        </h1>
        <p class="text-gray-500 m-0">View and manage your notifications</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="handleMarkAllRead" :disabled="unreadCountStat === 0">
          <template #icon><CheckCheck :size="14" /></template>
          Mark All Read
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="24" :sm="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ totalCount }}</div>
            <div class="text-gray-500 text-sm">Total</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-500">{{ unreadCountStat }}</div>
            <div class="text-gray-500 text-sm">Unread</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ readCount }}</div>
            <div class="text-gray-500 text-sm">Read</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="8">
          <a-input v-model:value="searchQuery" placeholder="Search notifications..." allow-clear>
            <template #prefix><Search :size="14" class="text-gray-400" /></template>
          </a-input>
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-select v-model:value="statusFilter" placeholder="Filter by status" allow-clear style="width: 100%">
            <a-select-option value="unread">Unread</a-select-option>
            <a-select-option value="read">Read</a-select-option>
            <a-select-option value="dismissed">Dismissed</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-select v-model:value="typeFilter" placeholder="Filter by type" allow-clear style="width: 100%">
            <a-select-option value="info">Info</a-select-option>
            <a-select-option value="success">Success</a-select-option>
            <a-select-option value="warning">Warning</a-select-option>
            <a-select-option value="error">Error</a-select-option>
            <a-select-option value="action">Action</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="filteredNotifications"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }"
        row-key="id"
        size="middle"
        :row-class-name="(record: any) => record.status === 'unread' ? 'unread-row' : ''"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'title'">
            <span :class="{ 'font-semibold': record.status === 'unread' }">{{ record.title }}</span>
          </template>

          <template v-else-if="column.key === 'message'">
            <span class="text-sm text-gray-600">{{ record.message || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'type'">
            <a-tag :color="typeColors[record.type] || 'default'">
              {{ record.type }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'channel'">
            <span class="text-sm">{{ channelLabels[record.channel] || record.channel || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColors[record.status] || 'default'">
              {{ record.status }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'createdAt'">
            <a-tooltip :title="formatDate(record.createdAt || record.created_at)">
              <span class="text-sm">{{ formatRelativeTime(record.createdAt || record.created_at) }}</span>
            </a-tooltip>
          </template>

          <template v-else-if="column.key === 'actions'">
            <div class="actions-cell flex items-center gap-1">
              <a-tooltip v-if="record.status === 'unread'" title="Mark as Read">
                <a-button type="text" size="small" @click="handleMarkRead(record)">
                  <template #icon><Check :size="15" class="text-green-500" /></template>
                </a-button>
              </a-tooltip>
              <a-popconfirm v-if="record.status !== 'dismissed'" title="Dismiss this notification?" ok-text="Dismiss" @confirm="handleDismiss(record)">
                <a-tooltip title="Dismiss">
                  <a-button type="text" size="small">
                    <template #icon><X :size="15" class="text-gray-400" /></template>
                  </a-button>
                </a-tooltip>
              </a-popconfirm>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<style scoped>
.notifications-page {
  min-height: 100%;
}

.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

:deep(.unread-row) {
  background-color: #fafbff;
}

:deep(.actions-cell .ant-btn) {
  opacity: 0.55;
  transition: opacity 0.15s;
}
:deep(.ant-table-row:hover .actions-cell .ant-btn) {
  opacity: 1;
}
</style>
