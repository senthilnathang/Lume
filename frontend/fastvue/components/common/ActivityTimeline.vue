<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { Avatar, Empty, Select, Spin, Tag, Timeline } from 'ant-design-vue';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  FileAddOutlined,
  InfoCircleOutlined,
  LockOutlined,
  MailOutlined,
  SettingOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons-vue';

import { requestClient } from '#/api/request';

interface ActivityUser {
  id: number;
  full_name: string | null;
  avatar_url: string | null;
}

interface ActivityLog {
  id: number;
  event_id: string;
  action: string;
  category: string | null;
  level: string | null;
  entity_type: string;
  entity_id: number | null;
  entity_name: string | null;
  description: string | null;
  user_id: number | null;
  company_id: number | null;
  ip_address: string | null;
  success: boolean;
  created_at: string;
  user: ActivityUser | null;
}

interface Props {
  entityType?: string;
  entityId?: number;
  userId?: number;
  limit?: number;
  showFilters?: boolean;
  title?: string;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  entityType: undefined,
  entityId: undefined,
  userId: undefined,
  limit: 50,
  showFilters: true,
  title: 'Activity Timeline',
  compact: false,
});

const activities = ref<ActivityLog[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedCategory = ref<string | null>(null);
const selectedAction = ref<string | null>(null);

// Category options
const categoryOptions = [
  { value: null, label: 'All Categories' },
  { value: 'AUTHENTICATION', label: 'Authentication' },
  { value: 'USER_MANAGEMENT', label: 'User Management' },
  { value: 'DATA_ACCESS', label: 'Data Access' },
  { value: 'DATA_MODIFICATION', label: 'Data Modification' },
  { value: 'SYSTEM', label: 'System' },
  { value: 'WORKFLOW', label: 'Workflow' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'COMMUNICATION', label: 'Communication' },
];

// Action options
const actionOptions = [
  { value: null, label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'read', label: 'Read' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
  { value: 'submit', label: 'Submit' },
];

// Get icon based on action
function getActionIcon(action: string) {
  const iconMap: Record<string, any> = {
    create: FileAddOutlined,
    read: InfoCircleOutlined,
    update: EditOutlined,
    delete: CloseCircleOutlined,
    login: UserOutlined,
    logout: UserOutlined,
    approve: CheckCircleOutlined,
    reject: CloseCircleOutlined,
    submit: MailOutlined,
    settings: SettingOutlined,
    security: LockOutlined,
  };
  return iconMap[action] || InfoCircleOutlined;
}

// Get color based on level or success
function getTimelineColor(activity: ActivityLog): string {
  if (!activity.success) return 'red';

  const levelColors: Record<string, string> = {
    critical: 'red',
    error: 'red',
    warning: 'orange',
    info: 'blue',
    debug: 'gray',
  };

  if (activity.level) {
    return levelColors[activity.level] || 'blue';
  }

  // Default colors based on action
  const actionColors: Record<string, string> = {
    create: 'green',
    update: 'blue',
    delete: 'red',
    login: 'cyan',
    logout: 'gray',
    approve: 'green',
    reject: 'red',
  };

  return actionColors[activity.action] || 'blue';
}

// Format timestamp
function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format action for display
function formatAction(action: string): string {
  return action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, ' ');
}

// Get level tag color
function getLevelTagColor(level: string | null): string {
  const colors: Record<string, string> = {
    critical: 'red',
    error: 'red',
    warning: 'orange',
    info: 'blue',
    debug: 'default',
  };
  return level ? colors[level] || 'default' : 'default';
}

// Fetch activities
async function fetchActivities() {
  loading.value = true;
  error.value = null;

  try {
    let url = '/activity-logs/';
    const params: Record<string, any> = {
      page_size: props.limit,
    };

    // Use specific endpoints for entity or user
    if (props.entityType && props.entityId) {
      url = `/activity-logs/entity/${props.entityType}/${props.entityId}`;
      params.limit = props.limit;
    } else if (props.userId) {
      url = `/activity-logs/user/${props.userId}`;
      params.limit = props.limit;
      if (selectedAction.value) {
        params.action = selectedAction.value;
      }
    } else {
      // Generic list with filters
      if (selectedCategory.value) {
        params.category = selectedCategory.value;
      }
      if (selectedAction.value) {
        params.action = selectedAction.value;
      }
    }

    const response = await requestClient.get<any>(url, { params });

    // Handle different response formats
    if (Array.isArray(response)) {
      activities.value = response;
    } else if (response.items) {
      activities.value = response.items;
    } else {
      activities.value = [];
    }
  } catch (err: any) {
    console.error('Failed to fetch activities:', err);
    error.value = err?.message || 'Failed to load activities';
    activities.value = [];
  } finally {
    loading.value = false;
  }
}

// Filter activities locally if needed
const filteredActivities = computed(() => {
  let result = activities.value;

  // Additional client-side filtering if needed
  if (selectedCategory.value && !props.entityType && !props.userId) {
    result = result.filter((a) => a.category === selectedCategory.value);
  }

  return result;
});

// Watch for filter changes
watch([selectedCategory, selectedAction], () => {
  fetchActivities();
});

// Watch for prop changes
watch(
  () => [props.entityType, props.entityId, props.userId],
  () => {
    fetchActivities();
  },
);

onMounted(() => {
  fetchActivities();
});

// Expose refresh method
defineExpose({
  refresh: fetchActivities,
});
</script>

<template>
  <div class="activity-timeline">
    <!-- Header -->
    <div v-if="title || showFilters" class="timeline-header">
      <h3 v-if="title" class="timeline-title">{{ title }}</h3>

      <div v-if="showFilters && !entityType && !userId" class="timeline-filters">
        <Select
          v-model:value="(selectedCategory as any)"
          placeholder="Category"
          :options="categoryOptions"
          allow-clear
          style="width: 150px"
          size="small"
        />
        <Select
          v-model:value="(selectedAction as any)"
          placeholder="Action"
          :options="actionOptions"
          allow-clear
          style="width: 120px"
          size="small"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <Spin />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <WarningOutlined class="error-icon" />
      <span>{{ error }}</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredActivities.length === 0" class="empty-state">
      <Empty description="No activities found" />
    </div>

    <!-- Timeline -->
    <Timeline v-else :class="{ compact }">
      <Timeline.Item
        v-for="activity in filteredActivities"
        :key="activity.id"
        :color="getTimelineColor(activity)"
      >
        <template #dot>
          <component
            :is="getActionIcon(activity.action)"
            :class="['timeline-dot', { failed: !activity.success }]"
          />
        </template>

        <div class="activity-item">
          <div class="activity-header">
            <div class="activity-user">
              <Avatar
                v-if="activity.user"
                :src="activity.user.avatar_url ?? undefined"
                :size="compact ? 20 : 24"
              >
                {{ activity.user.full_name?.charAt(0) || 'U' }}
              </Avatar>
              <span class="user-name">
                {{ activity.user?.full_name || 'System' }}
              </span>
            </div>
            <span class="activity-time">{{ formatTime(activity.created_at) }}</span>
          </div>

          <div class="activity-content">
            <span class="activity-action">
              {{ formatAction(activity.action) }}
            </span>
            <span v-if="activity.entity_type" class="activity-entity">
              {{ activity.entity_type }}
              <template v-if="activity.entity_name">
                : <strong>{{ activity.entity_name }}</strong>
              </template>
            </span>
          </div>

          <p v-if="activity.description && !compact" class="activity-description">
            {{ activity.description }}
          </p>

          <div v-if="!compact" class="activity-meta">
            <Tag v-if="activity.category" size="small">
              {{ activity.category }}
            </Tag>
            <Tag
              v-if="activity.level"
              :color="getLevelTagColor(activity.level)"
              size="small"
            >
              {{ activity.level }}
            </Tag>
            <Tag v-if="!activity.success" color="error" size="small">
              Failed
            </Tag>
          </div>
        </div>
      </Timeline.Item>
    </Timeline>
  </div>
</template>

<style scoped>
.activity-timeline {
  display: flex;
  flex-direction: column;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.timeline-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.timeline-filters {
  display: flex;
  gap: 8px;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: #6b7280;
}

.error-state {
  flex-direction: column;
  gap: 8px;
  color: #ef4444;
}

.error-icon {
  font-size: 24px;
}

.timeline-dot {
  font-size: 16px;
}

.timeline-dot.failed {
  color: #ef4444;
}

.activity-item {
  padding-bottom: 8px;
}

.activity-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.activity-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  font-weight: 500;
  color: #1f2937;
}

.activity-time {
  font-size: 12px;
  color: #9ca3af;
}

.activity-content {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 14px;
  color: #374151;
}

.activity-action {
  font-weight: 500;
}

.activity-entity {
  color: #6b7280;
}

.activity-description {
  margin: 8px 0 0;
  padding: 8px 12px;
  font-size: 13px;
  color: #4b5563;
  background: #f9fafb;
  border-radius: 4px;
  border-left: 3px solid #e5e7eb;
}

.activity-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

/* Compact mode */
.compact .activity-item {
  padding-bottom: 4px;
}

.compact .activity-header {
  margin-bottom: 2px;
}

.compact .activity-content {
  font-size: 13px;
}

.compact .activity-time {
  font-size: 11px;
}
</style>
