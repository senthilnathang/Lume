<script lang="ts" setup>
/**
 * ActivityFeed Component
 *
 * Displays a timeline of activities for any entity.
 * Supports filtering, pagination, and real-time updates.
 */
import { computed, onMounted, ref, watch } from 'vue';

import {
  Avatar,
  Card,
  Empty,
  Select,
  Spin,
  Tag,
  Timeline,
  Tooltip,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileAddOutlined,
  InfoCircleOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';

import { requestClient } from '#/api/request';

// Props
interface Props {
  entityType?: string;
  entityId?: number;
  userId?: number;
  limit?: number;
  showFilters?: boolean;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  entityType: undefined,
  entityId: undefined,
  userId: undefined,
  limit: 20,
  showFilters: true,
  compact: false,
});

// Emits
const emit = defineEmits<{
  (e: 'activityClick', activity: Activity): void;
}>();

// Types
interface Activity {
  id: number;
  event_id: string;
  action: string;
  category: string;
  level: string;
  entity_type: string;
  entity_id: number | null;
  entity_name: string | null;
  description: string | null;
  user_id: number | null;
  user?: {
    id: number;
    full_name: string;
    avatar_url: string | null;
  };
  created_at: string;
  ip_address: string | null;
  success: boolean;
}

// State
const loading = ref(false);
const activities = ref<Activity[]>([]);
const selectedAction = ref<string | null>(null);

// Action filter options
const actionOptions = [
  { value: null, label: 'All Actions' },
  { value: 'create', label: 'Created' },
  { value: 'update', label: 'Updated' },
  { value: 'delete', label: 'Deleted' },
  { value: 'view', label: 'Viewed' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
];

// Action icons mapping
const actionIcons: Record<string, any> = {
  create: FileAddOutlined,
  update: EditOutlined,
  delete: DeleteOutlined,
  view: EyeOutlined,
  read: EyeOutlined,
  login: UserOutlined,
  logout: UserOutlined,
  approve: CheckCircleOutlined,
  reject: ExclamationCircleOutlined,
};

// Action colors
const actionColors: Record<string, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  view: 'default',
  read: 'default',
  login: 'cyan',
  logout: 'orange',
  approve: 'green',
  reject: 'red',
};

// Level colors
const levelColors: Record<string, string> = {
  debug: 'default',
  info: 'blue',
  warning: 'orange',
  error: 'red',
  critical: 'magenta',
};

// Computed
const filteredActivities = computed(() => {
  if (!selectedAction.value) {
    return activities.value;
  }
  return activities.value.filter((a) => a.action === selectedAction.value);
});

// Methods
async function fetchActivities() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      limit: props.limit,
    };

    if (props.entityType) {
      params.entity_type = props.entityType;
    }
    if (props.entityId) {
      params.entity_id = props.entityId;
    }
    if (props.userId) {
      params.user_id = props.userId;
    }
    if (selectedAction.value) {
      params.action = selectedAction.value;
    }

    const response = await requestClient.get<Activity[]>('/activity-logs/', {
      params,
    });
    activities.value = response || [];
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    activities.value = [];
  } finally {
    loading.value = false;
  }
}

function getActionIcon(action: string) {
  return actionIcons[action] || InfoCircleOutlined;
}

function getActionColor(action: string): string {
  return actionColors[action] || 'default';
}

function getLevelColor(level: string): string {
  return levelColors[level] || 'default';
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function handleActivityClick(activity: Activity) {
  emit('activityClick', activity);
}

// Watchers
watch(selectedAction, () => {
  fetchActivities();
});

// Lifecycle
onMounted(() => {
  fetchActivities();
});

// Expose refresh method
defineExpose({ refresh: fetchActivities });
</script>

<template>
  <Card :bordered="false" :body-style="{ padding: compact ? '12px' : '24px' }">
    <template #title>
      <div class="flex items-center justify-between">
        <span>
          <ClockCircleOutlined class="mr-2" />
          Activity Feed
        </span>
        <Select
          v-if="showFilters"
          v-model:value="(selectedAction as any)"
          :options="actionOptions"
          style="width: 140px"
          size="small"
          placeholder="Filter"
        />
      </div>
    </template>

    <Spin :spinning="loading">
      <Empty
        v-if="filteredActivities.length === 0 && !loading"
        description="No activities found"
      />

      <Timeline v-else>
        <Timeline.Item
          v-for="activity in filteredActivities"
          :key="activity.id"
          :color="getActionColor(activity.action)"
        >
          <template #dot>
            <component
              :is="getActionIcon(activity.action)"
              class="text-base"
            />
          </template>

          <div
            class="cursor-pointer rounded p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
            @click="handleActivityClick(activity)"
          >
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-2">
                <Avatar
                  v-if="activity.user"
                  :src="activity.user.avatar_url ?? undefined"
                  :size="compact ? 24 : 32"
                >
                  <template #icon>
                    <UserOutlined />
                  </template>
                </Avatar>
                <div>
                  <span class="font-medium">
                    {{ activity.user?.full_name || 'System' }}
                  </span>
                  <Tag :color="getActionColor(activity.action)" size="small">
                    {{ activity.action }}
                  </Tag>
                  <span v-if="activity.entity_name" class="text-gray-600">
                    {{ activity.entity_name }}
                  </span>
                </div>
              </div>
              <Tooltip :title="new Date(activity.created_at).toLocaleString()">
                <span class="text-xs text-gray-400">
                  {{ formatTime(activity.created_at) }}
                </span>
              </Tooltip>
            </div>

            <p
              v-if="activity.description && !compact"
              class="mt-1 text-sm text-gray-500"
            >
              {{ activity.description }}
            </p>

            <div v-if="!compact" class="mt-1 flex gap-2">
              <Tag v-if="activity.level !== 'info'" :color="getLevelColor(activity.level)" size="small">
                {{ activity.level }}
              </Tag>
              <span v-if="activity.ip_address" class="text-xs text-gray-400">
                IP: {{ activity.ip_address }}
              </span>
            </div>
          </div>
        </Timeline.Item>
      </Timeline>
    </Spin>
  </Card>
</template>
