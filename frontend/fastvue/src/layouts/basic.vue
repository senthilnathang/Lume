<script lang="ts" setup>
import type { NotificationItem } from '@vben/layouts';

import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import {
  BasicLayout,
  LockScreen,
  Notification,
  UserDropdown,
} from '@vben/layouts';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import { requestClient } from '#/api/request';
import { CompanySwitcher } from '#/components/common';
import { useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';

const notifications = ref<NotificationItem[]>([]);
const unreadCount = ref(0);
const inboxAvailable = ref(false);
let pollInterval: ReturnType<typeof setInterval> | null = null;

const router = useRouter();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const userStore = useUserStore();

const showDot = computed(() => inboxAvailable.value && unreadCount.value > 0);

const menus = computed(() => {
  const items = [
    {
      handler: () => {
        router.push('/profile');
      },
      icon: 'lucide:user',
      text: 'Profile',
    },
  ];
  if (inboxAvailable.value) {
    items.push(
      {
        handler: () => {
          router.push('/inbox/notifications');
        },
        icon: 'lucide:bell',
        text: 'Notifications',
      },
    );
  }
  return items;
});

// Get user info from store
const userName = computed(() => userStore.userInfo?.realName || userStore.userInfo?.username || 'User');
const userAvatar = computed(() => userStore.userInfo?.avatar || preferences.app.defaultAvatar);

// Map API notification to UI notification item
function mapNotification(notification: any): NotificationItem {
  return {
    id: notification.id,
    avatar: notification.actor?.avatar_url || '',
    date: formatDate(notification.created_at || notification.timestamp),
    isRead: notification.is_read ?? !notification.unread,
    message: notification.description || '',
    title: notification.title || notification.verb || '',
  };
}

function formatDate(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function isInboxModuleInstalled(): boolean {
  // Check if inbox routes exist in the generated menus (no network request needed)
  const menus = accessStore.accessMenus || [];
  return menus.some((m: any) => m.path === '/inbox' || m.name === 'Inbox');
}

async function fetchNotifications() {
  // Skip entirely if inbox module is not installed
  if (!isInboxModuleInstalled()) {
    inboxAvailable.value = false;
    return;
  }

  try {
    const response: any = await requestClient.get('/inbox/notifications/', {
      params: { page_size: 10 },
    });
    const items = response.results || response.items || [];
    notifications.value = items.map(mapNotification);
    unreadCount.value = response.unread_count ?? items.filter((n: any) => n.unread).length;
    inboxAvailable.value = true;
  } catch {
    inboxAvailable.value = false;
  }
}

async function handleLogout() {
  await authStore.logout(false);
}

async function handleNoticeClear() {
  try {
    await requestClient.post('/inbox/notifications/bulk-read', { notification_ids: [] });
    notifications.value.forEach((item) => (item.isRead = true));
    unreadCount.value = 0;
  } catch (error) {
    console.error('Failed to clear notifications:', error);
    message.error('Failed to clear notifications');
  }
}

async function markRead(id: number | string) {
  const item = notifications.value.find((item) => item.id === id);
  if (item && !item.isRead) {
    try {
      await requestClient.post('/inbox/notifications/bulk-read', {
        notification_ids: [Number(id)],
      });
      item.isRead = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }
}

async function remove(id: number | string) {
  try {
    await requestClient.delete(`/inbox/notifications/${Number(id)}`);
    const item = notifications.value.find((item) => item.id === id);
    if (item && !item.isRead) {
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
    notifications.value = notifications.value.filter((item) => item.id !== id);
  } catch (error) {
    console.error('Failed to remove notification:', error);
    message.error('Failed to remove notification');
  }
}

async function handleMakeAll() {
  try {
    await requestClient.post('/inbox/notifications/bulk-read', { notification_ids: [] });
    notifications.value.forEach((item) => (item.isRead = true));
    unreadCount.value = 0;
  } catch (error) {
    console.error('Failed to mark all as read:', error);
    message.error('Failed to mark all as read');
  }
}

onMounted(() => {
  fetchNotifications();
  pollInterval = setInterval(fetchNotifications, 30000);
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #user-dropdown>
      <UserDropdown
        :avatar="userAvatar"
        :menus
        :text="userName"
        :description="userStore.userInfo?.roles?.join(', ') || 'User'"
        tag-text="FastVue"
        @logout="handleLogout"
      />
    </template>
    <template #notification>
      <div class="flex items-center gap-2">
        <CompanySwitcher />
        <Notification
          :dot="showDot"
          :notifications="notifications"
          @clear="handleNoticeClear"
          @read="(item) => item.id && markRead(item.id)"
          @remove="(item) => item.id && remove(item.id)"
          @make-all="handleMakeAll"
        />
      </div>
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar="userAvatar"
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar="userAvatar" @to-login="handleLogout" />
    </template>
  </BasicLayout>
</template>
