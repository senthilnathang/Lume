<script lang="ts" setup>
import type {
  ActivityLog,
  ActivityMessage,
  ActivityThreadProps,
} from './types';

import { computed, onMounted, ref, watch } from 'vue';

import { VbenAvatar, VbenButton, VbenSpinner } from '@vben-core/shadcn-ui';
import { formatTimeAgo } from '@vben-core/shared/utils';

import { IconifyIcon } from '@vben/icons';

import {
  ACTIVITY_ACTION_ICONS,
  LEVEL_COLORS,
  MESSAGE_TYPE_COLORS,
  MESSAGE_TYPE_ICONS,
} from './types';

const props = withDefaults(defineProps<ActivityThreadProps>(), {
  readonly: false,
  showMessages: true,
  showActivities: true,
  maxHeight: '500px',
  accessToken: '',
  apiBase: '/api/v1',
});

const emit = defineEmits<{
  messageCreated: [message: ActivityMessage];
  messageDeleted: [messageId: number];
}>();

// State
const messages = ref<ActivityMessage[]>([]);
const activities = ref<ActivityLog[]>([]);
const loading = ref(false);
const submitting = ref(false);
const newMessageBody = ref('');
const replyingTo = ref<number | null>(null);
const activeTab = ref<'all' | 'messages' | 'activities'>('all');

// Computed API base from props
const apiBase = computed(() => props.apiBase || '/api/v1');

// Fetch functions
async function fetchMessages() {
  if (!props.showMessages) return;

  try {
    const response = await fetch(
      `${apiBase.value}/messages/?model_name=${props.modelName}&record_id=${props.recordId}`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    if (response.ok) {
      messages.value = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch messages:', error);
  }
}

async function fetchActivities() {
  if (!props.showActivities) return;

  try {
    const response = await fetch(
      `${apiBase.value}/activity-logs/entity/${props.modelName}/${props.recordId}`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    if (response.ok) {
      activities.value = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch activities:', error);
  }
}

async function fetchAll() {
  loading.value = true;
  await Promise.all([fetchMessages(), fetchActivities()]);
  loading.value = false;
}

// Actions
async function sendMessage() {
  if (!newMessageBody.value.trim()) return;

  submitting.value = true;
  try {
    const response = await fetch(`${apiBase.value}/messages/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        model_name: props.modelName,
        record_id: props.recordId,
        body: newMessageBody.value,
        parent_id: replyingTo.value,
        message_type: 'comment',
      }),
    });

    if (response.ok) {
      const message = await response.json();
      emit('messageCreated', message);
      newMessageBody.value = '';
      replyingTo.value = null;
      await fetchMessages();
    }
  } catch (error) {
    console.error('Failed to send message:', error);
  } finally {
    submitting.value = false;
  }
}

async function deleteMessage(messageId: number) {
  try {
    const response = await fetch(`${apiBase.value}/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    if (response.ok) {
      emit('messageDeleted', messageId);
      await fetchMessages();
    }
  } catch (error) {
    console.error('Failed to delete message:', error);
  }
}

function startReply(messageId: number) {
  replyingTo.value = messageId;
}

function cancelReply() {
  replyingTo.value = null;
}

// Helper functions
function getToken(): string {
  return props.accessToken || '';
}

function formatTime(dateStr: string): string {
  return formatTimeAgo(dateStr);
}

function getMessageIcon(type: string): string {
  return MESSAGE_TYPE_ICONS[type] || 'lucide:message-circle';
}

function getMessageColor(type: string): string {
  return MESSAGE_TYPE_COLORS[type] || '#1890ff';
}

function getActivityIcon(action: string): string {
  return ACTIVITY_ACTION_ICONS[action] || 'lucide:activity';
}

function getLevelColor(level: string): string {
  return LEVEL_COLORS[level] || '#1890ff';
}

// Combined timeline
const timeline = computed(() => {
  const items: Array<{
    id: string;
    type: 'message' | 'activity';
    data: ActivityMessage | ActivityLog;
    timestamp: Date;
  }> = [];

  if (activeTab.value === 'all' || activeTab.value === 'messages') {
    messages.value.forEach((msg) => {
      items.push({
        id: `msg-${msg.id}`,
        type: 'message',
        data: msg,
        timestamp: new Date(msg.created_at),
      });
    });
  }

  if (activeTab.value === 'all' || activeTab.value === 'activities') {
    activities.value.forEach((act) => {
      items.push({
        id: `act-${act.id}`,
        type: 'activity',
        data: act,
        timestamp: new Date(act.created_at),
      });
    });
  }

  // Sort by timestamp descending
  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
});

// Lifecycle
onMounted(() => {
  if (props.recordId) {
    fetchAll();
  }
});

watch(
  () => [props.modelName, props.recordId],
  () => {
    if (props.recordId) {
      fetchAll();
    }
  },
);

defineExpose({
  refresh: fetchAll,
  fetchMessages,
  fetchActivities,
});
</script>

<template>
  <div class="activity-thread">
    <!-- Header with tabs -->
    <div class="activity-thread__header">
      <div class="activity-thread__tabs">
        <button
          :class="[
            'activity-thread__tab',
            activeTab === 'all' && 'activity-thread__tab--active',
          ]"
          @click="activeTab = 'all'"
        >
          All
        </button>
        <button
          v-if="showMessages"
          :class="[
            'activity-thread__tab',
            activeTab === 'messages' && 'activity-thread__tab--active',
          ]"
          @click="activeTab = 'messages'"
        >
          Messages ({{ messages.length }})
        </button>
        <button
          v-if="showActivities"
          :class="[
            'activity-thread__tab',
            activeTab === 'activities' && 'activity-thread__tab--active',
          ]"
          @click="activeTab = 'activities'"
        >
          Activities ({{ activities.length }})
        </button>
      </div>
      <VbenButton size="sm" variant="ghost" @click="fetchAll">
        <IconifyIcon icon="lucide:refresh-cw" class="mr-1 h-4 w-4" />
        Refresh
      </VbenButton>
    </div>

    <!-- Message input -->
    <div v-if="!readonly && showMessages" class="activity-thread__input">
      <div v-if="replyingTo" class="activity-thread__replying">
        <span>Replying to message #{{ replyingTo }}</span>
        <button class="activity-thread__cancel-reply" @click="cancelReply">
          <IconifyIcon icon="lucide:x" class="h-4 w-4" />
        </button>
      </div>
      <div class="activity-thread__input-row">
        <textarea
          v-model="newMessageBody"
          class="activity-thread__textarea"
          placeholder="Write a message..."
          rows="2"
          @keydown.enter.ctrl="sendMessage"
        />
        <VbenButton
          :disabled="!newMessageBody.trim() || submitting"
          :loading="submitting"
          size="sm"
          @click="sendMessage"
        >
          <IconifyIcon icon="lucide:send" class="mr-1 h-4 w-4" />
          Send
        </VbenButton>
      </div>
    </div>

    <!-- Timeline content -->
    <div
      class="activity-thread__content"
      :style="{ maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }"
    >
      <div v-if="loading" class="activity-thread__loading">
        <VbenSpinner />
        <span>Loading...</span>
      </div>

      <div v-else-if="timeline.length === 0" class="activity-thread__empty">
        <IconifyIcon icon="lucide:inbox" class="h-12 w-12 opacity-30" />
        <span>No activity yet</span>
      </div>

      <div v-else class="activity-thread__timeline">
        <div
          v-for="item in timeline"
          :key="item.id"
          class="activity-thread__item"
        >
          <!-- Message item -->
          <template v-if="item.type === 'message'">
            <div class="activity-thread__message">
              <div class="activity-thread__message-avatar">
                <VbenAvatar
                  v-if="(item.data as ActivityMessage).user?.avatar_url"
                  :src="(item.data as ActivityMessage).user?.avatar_url || ''"
                  class="h-8 w-8"
                />
                <div v-else class="activity-thread__avatar-placeholder">
                  <IconifyIcon
                    :icon="getMessageIcon((item.data as ActivityMessage).message_type)"
                    class="h-4 w-4"
                    :style="{ color: getMessageColor((item.data as ActivityMessage).message_type) }"
                  />
                </div>
              </div>
              <div class="activity-thread__message-content">
                <div class="activity-thread__message-header">
                  <span class="activity-thread__message-author">
                    {{ (item.data as ActivityMessage).user?.full_name || 'System' }}
                  </span>
                  <span
                    class="activity-thread__message-type"
                    :style="{ color: getMessageColor((item.data as ActivityMessage).message_type) }"
                  >
                    {{ (item.data as ActivityMessage).message_type }}
                  </span>
                  <span class="activity-thread__message-time">
                    {{ formatTime((item.data as ActivityMessage).created_at) }}
                  </span>
                </div>
                <div class="activity-thread__message-body">
                  {{ (item.data as ActivityMessage).body }}
                </div>
                <div v-if="!readonly" class="activity-thread__message-actions">
                  <button
                    class="activity-thread__action-btn"
                    @click="startReply((item.data as ActivityMessage).id)"
                  >
                    <IconifyIcon icon="lucide:reply" class="h-3 w-3" />
                    Reply
                  </button>
                  <button
                    class="activity-thread__action-btn activity-thread__action-btn--danger"
                    @click="deleteMessage((item.data as ActivityMessage).id)"
                  >
                    <IconifyIcon icon="lucide:trash-2" class="h-3 w-3" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- Activity item -->
          <template v-else>
            <div class="activity-thread__activity">
              <div class="activity-thread__activity-icon">
                <IconifyIcon
                  :icon="getActivityIcon((item.data as ActivityLog).action)"
                  class="h-4 w-4"
                  :style="{ color: getLevelColor((item.data as ActivityLog).level) }"
                />
              </div>
              <div class="activity-thread__activity-content">
                <div class="activity-thread__activity-header">
                  <span class="activity-thread__activity-user">
                    {{ (item.data as ActivityLog).user?.full_name || 'System' }}
                  </span>
                  <span
                    class="activity-thread__activity-action"
                    :style="{ color: getLevelColor((item.data as ActivityLog).level) }"
                  >
                    {{ (item.data as ActivityLog).action }}
                  </span>
                  <span class="activity-thread__activity-entity">
                    {{ (item.data as ActivityLog).entity_name || (item.data as ActivityLog).entity_type }}
                  </span>
                  <span class="activity-thread__activity-time">
                    {{ formatTime((item.data as ActivityLog).created_at) }}
                  </span>
                </div>
                <div
                  v-if="(item.data as ActivityLog).description"
                  class="activity-thread__activity-description"
                >
                  {{ (item.data as ActivityLog).description }}
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.activity-thread {
  @apply border-border bg-card rounded-lg border;
}

.activity-thread__header {
  @apply border-border flex items-center justify-between border-b px-4 py-3;
}

.activity-thread__tabs {
  @apply flex gap-1;
}

.activity-thread__tab {
  @apply text-muted-foreground hover:bg-accent rounded px-3 py-1.5 text-sm transition-colors;
}

.activity-thread__tab--active {
  @apply bg-primary text-primary-foreground;
}

.activity-thread__input {
  @apply border-border border-b p-4;
}

.activity-thread__replying {
  @apply bg-accent text-accent-foreground mb-2 flex items-center justify-between rounded px-3 py-1.5 text-sm;
}

.activity-thread__cancel-reply {
  @apply text-muted-foreground hover:text-foreground;
}

.activity-thread__input-row {
  @apply flex gap-2;
}

.activity-thread__textarea {
  @apply border-input bg-background ring-offset-background focus-visible:ring-ring flex-1 resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none;
}

.activity-thread__content {
  @apply overflow-y-auto;
}

.activity-thread__loading {
  @apply flex flex-col items-center justify-center gap-2 py-12;
}

.activity-thread__empty {
  @apply text-muted-foreground flex flex-col items-center justify-center gap-2 py-12;
}

.activity-thread__timeline {
  @apply divide-border divide-y;
}

.activity-thread__item {
  @apply p-4;
}

.activity-thread__message {
  @apply flex gap-3;
}

.activity-thread__message-avatar {
  @apply shrink-0;
}

.activity-thread__avatar-placeholder {
  @apply bg-accent flex h-8 w-8 items-center justify-center rounded-full;
}

.activity-thread__message-content {
  @apply min-w-0 flex-1;
}

.activity-thread__message-header {
  @apply mb-1 flex flex-wrap items-center gap-2 text-sm;
}

.activity-thread__message-author {
  @apply font-medium;
}

.activity-thread__message-type {
  @apply rounded px-1.5 py-0.5 text-xs font-medium uppercase;
  background-color: color-mix(in srgb, currentColor 10%, transparent);
}

.activity-thread__message-time {
  @apply text-muted-foreground text-xs;
}

.activity-thread__message-body {
  @apply text-foreground text-sm whitespace-pre-wrap;
}

.activity-thread__message-actions {
  @apply mt-2 flex gap-3;
}

.activity-thread__action-btn {
  @apply text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors;
}

.activity-thread__action-btn--danger {
  @apply hover:text-destructive;
}

.activity-thread__activity {
  @apply flex gap-3;
}

.activity-thread__activity-icon {
  @apply bg-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-full;
}

.activity-thread__activity-content {
  @apply min-w-0 flex-1;
}

.activity-thread__activity-header {
  @apply mb-1 flex flex-wrap items-center gap-2 text-sm;
}

.activity-thread__activity-user {
  @apply font-medium;
}

.activity-thread__activity-action {
  @apply font-medium;
}

.activity-thread__activity-entity {
  @apply text-muted-foreground;
}

.activity-thread__activity-time {
  @apply text-muted-foreground text-xs;
}

.activity-thread__activity-description {
  @apply text-muted-foreground text-sm;
}
</style>
