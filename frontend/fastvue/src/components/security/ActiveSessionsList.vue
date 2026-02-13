<script setup lang="ts">
/**
 * Active Sessions List
 *
 * Displays and manages active user sessions.
 */
import { ref, computed } from 'vue';
import {
  Table,
  Button,
  Tag,
  Space,
  Popconfirm,
  Typography,
  Tooltip,
  message,
} from 'ant-design-vue';
import {
  DesktopOutlined,
  MobileOutlined,
  TabletOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';

import type { SecuritySession } from '#/store/trust';

const { Text } = Typography;

const props = defineProps<{
  sessions: SecuritySession[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'terminate', sessionId: string): void;
  (e: 'terminateAll'): void;
}>();

// State
const terminatingId = ref<string | null>(null);
const terminatingAll = ref(false);

// Computed
const otherSessions = computed(() =>
  props.sessions.filter((s) => !s.isCurrentSession),
);

const hasOtherSessions = computed(() => otherSessions.value.length > 0);

// Methods
function getDeviceIcon(userAgent: string) {
  if (/Mobile|Android|iPhone/.test(userAgent)) {
    return MobileOutlined;
  }
  if (/iPad|Tablet/.test(userAgent)) {
    return TabletOutlined;
  }
  return DesktopOutlined;
}

function getDeviceName(userAgent: string): string {
  // Extract browser name
  const browserMatch = userAgent.match(
    /(Chrome|Firefox|Safari|Edge|Opera|MSIE)[\/\s](\d+)/i,
  );
  const browser = browserMatch ? (browserMatch[1] ?? 'Browser') : 'Browser';

  // Extract OS
  if (/Windows/.test(userAgent)) return `${browser} on Windows`;
  if (/Mac OS/.test(userAgent)) return `${browser} on macOS`;
  if (/Linux/.test(userAgent)) return `${browser} on Linux`;
  if (/Android/.test(userAgent)) return `${browser} on Android`;
  if (/iPhone|iPad/.test(userAgent)) return `${browser} on iOS`;

  return browser;
}

function getTrustLevelTag(level: string) {
  const config: Record<string, { color: string; label: string }> = {
    none: { color: 'red', label: 'None' },
    low: { color: 'orange', label: 'Low' },
    medium: { color: 'gold', label: 'Medium' },
    high: { color: 'green', label: 'High' },
    critical: { color: 'blue', label: 'Maximum' },
  };
  return config[level] ?? { color: 'orange', label: 'Low' };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

async function handleTerminate(sessionId: string) {
  terminatingId.value = sessionId;
  try {
    emit('terminate', sessionId);
    message.success('Session terminated');
  } finally {
    terminatingId.value = null;
  }
}

async function handleTerminateAll() {
  terminatingAll.value = true;
  try {
    emit('terminateAll');
    message.success('All other sessions terminated');
  } finally {
    terminatingAll.value = false;
  }
}

// Table columns
const columns: ColumnsType = [
  {
    title: 'Device',
    key: 'device',
    width: 250,
  },
  {
    title: 'Location',
    key: 'location',
    width: 150,
  },
  {
    title: 'Trust Level',
    key: 'trustLevel',
    width: 120,
  },
  {
    title: 'Last Activity',
    key: 'lastActivity',
    width: 150,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 100,
    align: 'center',
  },
];
</script>

<template>
  <div class="sessions-list">
    <!-- Header with terminate all button -->
    <div v-if="hasOtherSessions" class="sessions-header">
      <Text type="secondary">
        {{ otherSessions.length }} other active
        {{ otherSessions.length === 1 ? 'session' : 'sessions' }}
      </Text>
      <Popconfirm
        title="Terminate all other sessions?"
        description="You will remain logged in on this device only."
        ok-text="Terminate All"
        cancel-text="Cancel"
        @confirm="handleTerminateAll"
      >
        <Button
          type="primary"
          danger
          size="small"
          :loading="terminatingAll"
        >
          <template #icon><DeleteOutlined /></template>
          Terminate All Others
        </Button>
      </Popconfirm>
    </div>

    <!-- Sessions table -->
    <Table
      :columns="columns"
      :data-source="sessions"
      :loading="loading"
      :pagination="false"
      row-key="sessionId"
      size="small"
    >
      <!-- Device column -->
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'device'">
          <Space>
            <component
              :is="getDeviceIcon(record.userAgent)"
              class="device-icon"
            />
            <div>
              <div class="device-name">
                {{ getDeviceName(record.userAgent) }}
                <Tag v-if="record.isCurrentSession" color="blue" size="small">
                  <CheckCircleOutlined /> Current
                </Tag>
              </div>
              <Text type="secondary" class="ip-address">
                {{ record.ipAddress }}
              </Text>
            </div>
          </Space>
        </template>

        <!-- Location column -->
        <template v-else-if="column.key === 'location'">
          <Space v-if="record.location">
            <GlobalOutlined />
            <span>
              {{ record.location?.city || 'Unknown' }},
              {{ record.location?.country || 'Unknown' }}
            </span>
          </Space>
          <Text v-else type="secondary">Unknown</Text>
        </template>

        <!-- Trust Level column -->
        <template v-else-if="column.key === 'trustLevel'">
          <Tag :color="getTrustLevelTag(record.trustLevel).color">
            {{ getTrustLevelTag(record.trustLevel).label }}
          </Tag>
        </template>

        <!-- Last Activity column -->
        <template v-else-if="column.key === 'lastActivity'">
          <Tooltip :title="formatDate(record.lastActivityAt)">
            <Space>
              <ClockCircleOutlined />
              {{ formatRelativeTime(record.lastActivityAt) }}
            </Space>
          </Tooltip>
        </template>

        <!-- Actions column -->
        <template v-else-if="column.key === 'actions'">
          <Popconfirm
            v-if="!record.isCurrentSession"
            title="Terminate this session?"
            description="The user will be logged out from this device."
            ok-text="Terminate"
            cancel-text="Cancel"
            @confirm="handleTerminate(record.sessionId)"
          >
            <Button
              type="text"
              danger
              size="small"
              :loading="terminatingId === record.sessionId"
            >
              <template #icon><DeleteOutlined /></template>
            </Button>
          </Popconfirm>
          <Text v-else type="secondary">-</Text>
        </template>
      </template>
    </Table>
  </div>
</template>

<style scoped>
.sessions-list {
  width: 100%;
}

.sessions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.device-icon {
  font-size: 20px;
  color: #8c8c8c;
}

.device-name {
  font-weight: 500;
}

.ip-address {
  font-size: 12px;
}
</style>
