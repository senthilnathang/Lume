<script setup lang="ts">
import { useNotificationContainer } from '#/composables/useNotification';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons-vue';

const { notifications, remove } = useNotificationContainer();

const iconMap = {
  success: CheckCircleOutlined,
  error: CloseCircleOutlined,
  warning: ExclamationCircleOutlined,
  info: InfoCircleOutlined,
};

const colorMap = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const iconColorMap = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80">
      <TransitionGroup name="notification">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="[
            'rounded-lg border p-4 shadow-lg backdrop-blur-sm',
            colorMap[notification.type],
          ]"
        >
          <div class="flex items-start gap-3">
            <component
              :is="iconMap[notification.type]"
              :class="['text-lg flex-shrink-0 mt-0.5', iconColorMap[notification.type]]"
            />
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm">{{ notification.title }}</p>
              <p v-if="notification.message" class="mt-1 text-xs opacity-80">
                {{ notification.message }}
              </p>
              <button
                v-if="notification.action"
                class="mt-2 text-xs font-medium underline hover:no-underline"
                @click="notification.action.onClick"
              >
                {{ notification.action.label }}
              </button>
            </div>
            <button
              v-if="notification.closable"
              class="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              @click="remove(notification.id)"
            >
              <CloseOutlined class="text-sm" />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.notification-enter-active {
  animation: notification-in 0.3s ease-out;
}

.notification-leave-active {
  animation: notification-out 0.2s ease-in;
}

@keyframes notification-in {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes notification-out {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}
</style>
