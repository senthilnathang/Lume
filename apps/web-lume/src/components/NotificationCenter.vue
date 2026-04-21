<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Bell } from 'lucide-vue-next';
import { get, put } from '@/api/request';
import { useWebSocket } from '@/composables/useWebSocket';

interface Notification {
  id: number | string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const notifications = ref<Notification[]>([]);
const unreadCount = ref(0);
const loading = ref(false);
const popoverVisible = ref(false);

useWebSocket();

// Tag color mapping by notification type
const typeColors: Record<string, string> = {
  info: 'blue',
  success: 'green',
  warning: 'orange',
  error: 'red',
  system: 'purple',
};

function tagColor(type: string): string {
  return typeColors[type] || 'default';
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

async function fetchNotifications() {
  loading.value = true;
  try {
    const data = await get<Notification[]>('/advanced_features/notifications', { limit: 20 });
    notifications.value = data || [];
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
  } finally {
    loading.value = false;
  }
}

async function fetchUnreadCount() {
  try {
    const data = await get<{ count: number }>('/advanced_features/notifications/unread-count');
    unreadCount.value = data?.count ?? 0;
  } catch (err) {
    console.error('Failed to fetch unread count:', err);
  }
}

async function markAsRead(notification: Notification) {
  if (notification.isRead) return;
  try {
    await put(`/advanced_features/notifications/${notification.id}/read`);
    notification.isRead = true;
    unreadCount.value = Math.max(0, unreadCount.value - 1);
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
  }
}

async function markAllAsRead() {
  try {
    await put('/advanced_features/notifications/read-all');
    notifications.value.forEach((n) => (n.isRead = true));
    unreadCount.value = 0;
  } catch (err) {
    console.error('Failed to mark all as read:', err);
  }
}

function onPopoverChange(visible: boolean) {
  popoverVisible.value = visible;
  if (visible) {
    fetchNotifications();
    fetchUnreadCount();
  }
}

// WebSocket notification listener
function handleWsNotification(event: Event) {
  const detail = (event as CustomEvent).detail;
  if (!detail) return;

  const incoming: Notification = {
    id: detail.id || Date.now(),
    title: detail.title || 'New Notification',
    message: detail.message || '',
    type: detail.type || 'info',
    isRead: false,
    createdAt: detail.createdAt || new Date().toISOString(),
  };

  notifications.value.unshift(incoming);
  // Keep list from growing unbounded
  if (notifications.value.length > 50) {
    notifications.value = notifications.value.slice(0, 50);
  }
  unreadCount.value++;
}

onMounted(() => {
  fetchUnreadCount();
  window.addEventListener('ws:notification', handleWsNotification);
});

onUnmounted(() => {
  window.removeEventListener('ws:notification', handleWsNotification);
});

const hasNotifications = computed(() => notifications.value.length > 0);

defineExpose({ unreadCount });
</script>

<template>
  <a-popover
    trigger="click"
    placement="bottomRight"
    :open="popoverVisible"
    @openChange="onPopoverChange"
    overlayClassName="notification-popover"
  >
    <template #content>
      <div class="w-80 max-h-96 flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100">
          <span class="text-sm font-semibold text-gray-700">Notifications</span>
          <a-button
            v-if="unreadCount > 0"
            type="link"
            size="small"
            class="text-xs p-0"
            @click="markAllAsRead"
          >
            Mark all as read
          </a-button>
        </div>

        <!-- List -->
        <div class="overflow-y-auto flex-1">
          <a-list
            v-if="hasNotifications"
            :loading="loading"
            :dataSource="notifications"
            size="small"
          >
            <template #renderItem="{ item }">
              <a-list-item
                class="cursor-pointer hover:bg-gray-50 transition-colors"
                :class="{ 'bg-blue-50/40': !item.isRead }"
                @click="markAsRead(item)"
              >
                <div class="flex flex-col gap-1 w-full px-1 py-0.5">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span
                        v-if="!item.isRead"
                        class="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"
                      />
                      <span class="text-sm font-medium text-gray-800 truncate max-w-[180px]">
                        {{ item.title }}
                      </span>
                    </div>
                    <a-tag :color="tagColor(item.type)" class="text-xs m-0">
                      {{ item.type }}
                    </a-tag>
                  </div>
                  <p class="text-xs text-gray-500 mb-0 line-clamp-2">{{ item.message }}</p>
                  <span class="text-xs text-gray-400">{{ timeAgo(item.createdAt) }}</span>
                </div>
              </a-list-item>
            </template>
          </a-list>

          <div v-else-if="!loading" class="py-8">
            <a-empty description="No notifications" :image-style="{ height: '48px' }" />
          </div>
        </div>
      </div>
    </template>

    <!-- Trigger: Bell icon with badge -->
    <span class="inline-flex items-center cursor-pointer">
      <a-badge :count="unreadCount" :overflow-count="99" size="small">
        <Bell class="w-5 h-5 text-gray-600 hover:text-gray-800 transition-colors" />
      </a-badge>
    </span>
  </a-popover>
</template>

<style scoped>
:deep(.ant-list-item) {
  padding: 8px 4px;
  border-bottom: 1px solid #f3f4f6;
}

:deep(.ant-list-item:last-child) {
  border-bottom: none;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
