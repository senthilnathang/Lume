<script setup lang="ts">
/**
 * Security Events Timeline
 *
 * Displays security events in a timeline format.
 */
import { computed } from 'vue';
import { Timeline, Tag, Typography, Space, Empty, Spin, Tooltip } from 'ant-design-vue';
import {
  LoginOutlined,
  LogoutOutlined,
  LockOutlined,
  UnlockOutlined,
  WarningOutlined,
  SafetyCertificateOutlined,
  MobileOutlined,
  GlobalOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  KeyOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons-vue';

import type { SecurityEvent } from '#/store/trust';

const { Text } = Typography;

const props = defineProps<{
  events: SecurityEvent[];
  loading?: boolean;
  compact?: boolean;
}>();

// Event type configurations
const eventConfig: Record<
  string,
  {
    icon: any;
    color: string;
    label: string;
    description: (data: Record<string, unknown>) => string;
  }
> = {
  login_success: {
    icon: LoginOutlined,
    color: 'green',
    label: 'Login Success',
    description: () => 'Successfully logged in',
  },
  login_failed: {
    icon: CloseCircleOutlined,
    color: 'red',
    label: 'Login Failed',
    description: (data) =>
      `Login attempt failed${data.reason ? `: ${data.reason}` : ''}`,
  },
  logout: {
    icon: LogoutOutlined,
    color: 'default',
    label: 'Logout',
    description: () => 'Logged out',
  },
  password_changed: {
    icon: KeyOutlined,
    color: 'blue',
    label: 'Password Changed',
    description: () => 'Password was updated',
  },
  mfa_enabled: {
    icon: SafetyCertificateOutlined,
    color: 'green',
    label: 'MFA Enabled',
    description: () => 'Two-factor authentication enabled',
  },
  mfa_disabled: {
    icon: UnlockOutlined,
    color: 'orange',
    label: 'MFA Disabled',
    description: () => 'Two-factor authentication disabled',
  },
  mfa_verified: {
    icon: CheckCircleOutlined,
    color: 'green',
    label: 'MFA Verified',
    description: () => 'MFA verification successful',
  },
  mfa_failed: {
    icon: CloseCircleOutlined,
    color: 'red',
    label: 'MFA Failed',
    description: () => 'MFA verification failed',
  },
  new_device: {
    icon: MobileOutlined,
    color: 'blue',
    label: 'New Device',
    description: (data) =>
      `New device detected: ${data.deviceName || 'Unknown device'}`,
  },
  device_trusted: {
    icon: CheckCircleOutlined,
    color: 'green',
    label: 'Device Trusted',
    description: (data) =>
      `Device marked as trusted: ${data.deviceName || 'Unknown device'}`,
  },
  device_blocked: {
    icon: CloseCircleOutlined,
    color: 'red',
    label: 'Device Blocked',
    description: (data) =>
      `Device blocked: ${data.deviceName || 'Unknown device'}`,
  },
  new_location: {
    icon: GlobalOutlined,
    color: 'blue',
    label: 'New Location',
    description: (data) =>
      `Login from new location: ${data.city || 'Unknown'}, ${data.country || 'Unknown'}`,
  },
  suspicious_location: {
    icon: WarningOutlined,
    color: 'orange',
    label: 'Suspicious Location',
    description: (data) =>
      `Unusual login location detected: ${data.city || 'Unknown'}, ${data.country || 'Unknown'}`,
  },
  impossible_travel: {
    icon: ExclamationCircleOutlined,
    color: 'red',
    label: 'Impossible Travel',
    description: (data) =>
      `Login from ${data.newLocation || 'new location'} - physically impossible travel detected`,
  },
  session_terminated: {
    icon: LogoutOutlined,
    color: 'orange',
    label: 'Session Terminated',
    description: (data) =>
      data.reason === 'user' ? 'Session terminated by user' : 'Session terminated',
  },
  step_up_required: {
    icon: LockOutlined,
    color: 'orange',
    label: 'Step-Up Required',
    description: (data) =>
      `Additional authentication required: ${data.reason || 'security policy'}`,
  },
  step_up_completed: {
    icon: UnlockOutlined,
    color: 'green',
    label: 'Step-Up Completed',
    description: () => 'Additional authentication successful',
  },
  permission_elevated: {
    icon: UserSwitchOutlined,
    color: 'blue',
    label: 'Permission Elevated',
    description: (data) =>
      `Permissions elevated to ${data.role || 'higher role'}`,
  },
  suspicious_activity: {
    icon: WarningOutlined,
    color: 'red',
    label: 'Suspicious Activity',
    description: (data) => data.description as string || 'Unusual activity detected',
  },
};

// Computed
const displayEvents = computed(() => {
  return props.events.map((event) => {
    const config = eventConfig[event.eventType] || {
      icon: SafetyCertificateOutlined,
      color: 'default',
      label: event.eventType,
      description: () => 'Security event',
    };

    return {
      ...event,
      config,
      formattedDescription: config.description(event.eventData || {}),
    };
  });
});

// Methods
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

function getRiskImpactTag(impact: number) {
  if (impact >= 20) return { color: 'red', label: 'High' };
  if (impact >= 10) return { color: 'orange', label: 'Medium' };
  if (impact > 0) return { color: 'gold', label: 'Low' };
  return null;
}
</script>

<template>
  <div class="events-timeline" :class="{ compact }">
    <Spin :spinning="loading">
      <Empty
        v-if="events.length === 0 && !loading"
        description="No security events"
      />

      <Timeline v-else>
        <Timeline.Item
          v-for="event in displayEvents"
          :key="event.id"
          :color="event.config.color"
        >
          <template #dot>
            <component :is="event.config.icon" class="timeline-icon" />
          </template>

          <div class="event-content">
            <div class="event-header">
              <Space>
                <Text strong>{{ event.config.label }}</Text>
                <Tag
                  v-if="getRiskImpactTag(event.riskImpact)"
                  :color="getRiskImpactTag(event.riskImpact)!.color"
                  size="small"
                >
                  {{ getRiskImpactTag(event.riskImpact)!.label }} Risk
                </Tag>
              </Space>
              <Tooltip :title="formatDate(event.createdAt)">
                <Text type="secondary" class="event-time">
                  {{ formatRelativeTime(event.createdAt) }}
                </Text>
              </Tooltip>
            </div>

            <Text type="secondary" class="event-description">
              {{ event.formattedDescription }}
            </Text>

            <div v-if="!compact && event.ipAddress" class="event-meta">
              <Text type="secondary">
                <GlobalOutlined /> {{ event.ipAddress }}
              </Text>
            </div>
          </div>
        </Timeline.Item>
      </Timeline>
    </Spin>
  </div>
</template>

<style scoped>
.events-timeline {
  width: 100%;
}

.timeline-icon {
  font-size: 16px;
}

.event-content {
  padding-bottom: 16px;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

.event-time {
  font-size: 12px;
  white-space: nowrap;
}

.event-description {
  display: block;
  font-size: 13px;
}

.event-meta {
  margin-top: 8px;
  font-size: 12px;
}

/* Compact mode */
.compact .event-content {
  padding-bottom: 8px;
}

.compact .event-header {
  margin-bottom: 2px;
}

.compact .event-meta {
  display: none;
}
</style>
