<script setup lang="ts">
/**
 * Known Devices List
 *
 * Displays and manages user's known devices.
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
  Dropdown,
  Menu,
  message,
} from 'ant-design-vue';
import {
  DesktopOutlined,
  MobileOutlined,
  TabletOutlined,
  CheckCircleOutlined,
  StopOutlined,
  DeleteOutlined,
  MoreOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';

import type { KnownDevice } from '#/store/trust';

const { Text } = Typography;

const props = defineProps<{
  devices: KnownDevice[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'trust', deviceId: number): void;
  (e: 'block', deviceId: number): void;
  (e: 'delete', deviceId: number): void;
}>();

// State
const actionDeviceId = ref<number | null>(null);

// Computed
const sortedDevices = computed(() => {
  return [...props.devices].sort((a, b) => {
    // Current device first
    if (a.isCurrentDevice) return -1;
    if (b.isCurrentDevice) return 1;
    // Then by last seen
    return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
  });
});

// Methods
function getDeviceIcon(deviceType: string) {
  switch (deviceType) {
    case 'mobile':
      return MobileOutlined;
    case 'tablet':
      return TabletOutlined;
    default:
      return DesktopOutlined;
  }
}

function getStatusTag(device: KnownDevice) {
  if (device.isBlocked) {
    return { color: 'red', label: 'Blocked', icon: StopOutlined };
  }
  if (device.isTrusted) {
    return { color: 'green', label: 'Trusted', icon: CheckCircleOutlined };
  }
  return { color: 'default', label: 'Unknown', icon: null };
}

function getTrustScoreColor(score: number): string {
  if (score >= 80) return '#52c41a';
  if (score >= 60) return '#faad14';
  if (score >= 40) return '#fa8c16';
  return '#ff4d4f';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString();
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
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

async function handleTrust(deviceId: number) {
  actionDeviceId.value = deviceId;
  try {
    emit('trust', deviceId);
    message.success('Device marked as trusted');
  } finally {
    actionDeviceId.value = null;
  }
}

async function handleBlock(deviceId: number) {
  actionDeviceId.value = deviceId;
  try {
    emit('block', deviceId);
    message.success('Device blocked');
  } finally {
    actionDeviceId.value = null;
  }
}

async function handleDelete(deviceId: number) {
  actionDeviceId.value = deviceId;
  try {
    emit('delete', deviceId);
    message.success('Device removed');
  } finally {
    actionDeviceId.value = null;
  }
}

// Table columns
const columns: ColumnsType = [
  {
    title: 'Device',
    key: 'device',
    width: 280,
  },
  {
    title: 'Status',
    key: 'status',
    width: 120,
  },
  {
    title: 'Trust Score',
    key: 'trustScore',
    width: 120,
    align: 'center',
  },
  {
    title: 'Last Seen',
    key: 'lastSeen',
    width: 150,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 80,
    align: 'center',
  },
];
</script>

<template>
  <div class="devices-list">
    <Table
      :columns="columns"
      :data-source="sortedDevices"
      :loading="loading"
      :pagination="false"
      row-key="id"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <!-- Device column -->
        <template v-if="column.key === 'device'">
          <Space>
            <div
              class="device-icon-wrapper"
              :class="{ blocked: record.isBlocked }"
            >
              <component :is="getDeviceIcon(record.deviceType)" />
            </div>
            <div>
              <div class="device-name">
                {{ record.deviceName }}
                <Tag v-if="record.isCurrentDevice" color="blue" size="small">
                  Current
                </Tag>
              </div>
              <Space size="small">
                <Text type="secondary" class="device-meta">
                  {{ record.lastIpAddress }}
                </Text>
                <Text type="secondary" class="device-meta">
                  First seen: {{ formatDate(record.firstSeenAt) }}
                </Text>
              </Space>
            </div>
          </Space>
        </template>

        <!-- Status column -->
        <template v-else-if="column.key === 'status'">
          <Tag :color="getStatusTag(record as any).color">
            <component
              v-if="getStatusTag(record as any).icon"
              :is="getStatusTag(record as any).icon"
            />
            {{ getStatusTag(record as any).label }}
          </Tag>
        </template>

        <!-- Trust Score column -->
        <template v-else-if="column.key === 'trustScore'">
          <Tooltip title="Device trust score based on usage history">
            <div class="trust-score">
              <SafetyCertificateOutlined
                :style="{ color: getTrustScoreColor(record.trustScore) }"
              />
              <span :style="{ color: getTrustScoreColor(record.trustScore) }">
                {{ record.trustScore }}
              </span>
            </div>
          </Tooltip>
        </template>

        <!-- Last Seen column -->
        <template v-else-if="column.key === 'lastSeen'">
          <Tooltip :title="formatDate(record.lastSeenAt)">
            <Space>
              <ClockCircleOutlined />
              {{ formatRelativeTime(record.lastSeenAt) }}
            </Space>
          </Tooltip>
        </template>

        <!-- Actions column -->
        <template v-else-if="column.key === 'actions'">
          <Dropdown
            v-if="!record.isCurrentDevice"
            :trigger="['click']"
            placement="bottomRight"
          >
            <Button
              type="text"
              size="small"
              :loading="actionDeviceId === record.id"
            >
              <template #icon><MoreOutlined /></template>
            </Button>
            <template #overlay>
              <Menu>
                <Menu.Item
                  v-if="!record.isTrusted && !record.isBlocked"
                  key="trust"
                  @click="handleTrust(record.id)"
                >
                  <Space>
                    <CheckCircleOutlined style="color: #52c41a" />
                    Mark as Trusted
                  </Space>
                </Menu.Item>
                <Menu.Item
                  v-if="!record.isBlocked"
                  key="block"
                  @click="handleBlock(record.id)"
                >
                  <Space>
                    <StopOutlined style="color: #ff4d4f" />
                    Block Device
                  </Space>
                </Menu.Item>
                <Menu.Item
                  v-if="record.isBlocked"
                  key="unblock"
                  @click="handleTrust(record.id)"
                >
                  <Space>
                    <CheckCircleOutlined style="color: #52c41a" />
                    Unblock Device
                  </Space>
                </Menu.Item>
                <Menu.Divider />
                <Popconfirm
                  title="Remove this device?"
                  description="The device will need to be verified again on next login."
                  ok-text="Remove"
                  cancel-text="Cancel"
                  placement="left"
                  @confirm="handleDelete(record.id)"
                >
                  <Menu.Item key="delete">
                    <Space>
                      <DeleteOutlined style="color: #ff4d4f" />
                      Remove Device
                    </Space>
                  </Menu.Item>
                </Popconfirm>
              </Menu>
            </template>
          </Dropdown>
          <Text v-else type="secondary">-</Text>
        </template>
      </template>
    </Table>
  </div>
</template>

<style scoped>
.devices-list {
  width: 100%;
}

.device-icon-wrapper {
  width: 40px;
  height: 40px;
  background: #f5f5f5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #595959;
}

.device-icon-wrapper.blocked {
  background: #fff1f0;
  color: #ff4d4f;
}

.device-name {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-meta {
  font-size: 12px;
}

.trust-score {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-weight: 500;
}
</style>
