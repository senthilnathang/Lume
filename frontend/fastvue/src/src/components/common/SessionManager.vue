<script setup lang="ts">
/**
 * Session Manager Component
 *
 * Monitors user activity and shows warning before session expires.
 * Uses useIdleDetection for inactivity tracking.
 */

import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Modal, Button, Progress } from 'ant-design-vue';
import { ClockCircleOutlined } from '@ant-design/icons-vue';

import { useIdleDetection, useNotification, useEventBus } from '#/composables';
import { useAuthStore } from '#/store';

interface Props {
  /** Idle timeout in minutes */
  timeout?: number;
  /** Warning time before timeout in minutes */
  warningTime?: number;
  /** Enable session management */
  enabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  timeout: 15, // 15 minutes
  warningTime: 2, // 2 minutes before timeout
  enabled: true,
});

const router = useRouter();
const authStore = useAuthStore();
const { warning } = useNotification();
const eventBus = useEventBus();

const timeoutMs = computed(() => props.timeout * 60 * 1000);
const warningMs = computed(() => props.warningTime * 60 * 1000);

const {
  isIdle,
  isWarning,
  remainingTime,
  reset,
  pause,
} = useIdleDetection({
  timeout: timeoutMs.value,
  warningTime: warningMs.value,
  onWarning: () => {
    warning('Session Expiring', {
      message: `Your session will expire in ${props.warningTime} minutes due to inactivity.`,
      duration: 0, // Don't auto-dismiss
    });
    eventBus.emit('session:warning', { remainingTime: warningMs.value });
  },
  onIdle: () => {
    handleSessionExpired();
  },
});

// Format remaining time
const formattedTime = computed(() => {
  const seconds = Math.floor(remainingTime.value / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
});

// Progress percentage for warning modal
const progressPercent = computed(() => {
  if (!isWarning.value) return 100;
  return Math.round((remainingTime.value / warningMs.value) * 100);
});

// Handle session expired
function handleSessionExpired() {
  eventBus.emit('session:expired', {});
  authStore.logout();
  router.push('/auth/login');
}

// Extend session
function handleExtendSession() {
  reset();
}

// Logout now
function handleLogout() {
  authStore.logout();
  router.push('/auth/login');
}

// Pause when modal is open (to prevent timeout during interaction)
onMounted(() => {
  if (!props.enabled) {
    pause();
  }
});
</script>

<template>
  <div v-if="enabled">
    <!-- Session Warning Modal -->
    <Modal
      :open="isWarning && !isIdle"
      :closable="false"
      :mask-closable="false"
      :footer="null"
      centered
      width="400px"
    >
      <div class="session-warning">
        <div class="session-warning__icon">
          <ClockCircleOutlined />
        </div>

        <h3 class="session-warning__title">Session Expiring</h3>

        <p class="session-warning__message">
          Your session will expire due to inactivity.
        </p>

        <div class="session-warning__timer">
          <Progress
            type="circle"
            :percent="progressPercent"
            :size="120"
            :stroke-color="progressPercent > 30 ? '#faad14' : '#ff4d4f'"
          >
            <template #format>
              <span class="session-warning__time">{{ formattedTime }}</span>
            </template>
          </Progress>
        </div>

        <div class="session-warning__actions">
          <Button type="primary" size="large" block @click="handleExtendSession">
            Stay Logged In
          </Button>
          <Button size="large" block @click="handleLogout">
            Logout Now
          </Button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.session-warning {
  text-align: center;
  padding: 24px 0;
}

.session-warning__icon {
  font-size: 48px;
  color: #faad14;
  margin-bottom: 16px;
}

.session-warning__title {
  font-size: 20px;
  font-weight: 600;
  color: #262626;
  margin: 0 0 8px 0;
}

.session-warning__message {
  font-size: 14px;
  color: #8c8c8c;
  margin: 0 0 24px 0;
}

.session-warning__timer {
  margin-bottom: 24px;
}

.session-warning__time {
  font-size: 24px;
  font-weight: 600;
  color: #262626;
}

.session-warning__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Dark mode */
:root.dark .session-warning__title {
  color: #f0f0f0;
}

:root.dark .session-warning__time {
  color: #f0f0f0;
}
</style>
