<script lang="ts" setup>
/**
 * MessageReply Component
 *
 * Renders a single message with recursive nested replies.
 * Used inside MessageThread for threaded display.
 */
import { computed, ref } from 'vue';
import { Avatar, Button, Tag } from 'ant-design-vue';
import { DownOutlined, RightOutlined, UserOutlined } from '@ant-design/icons-vue';

import MentionInput from '#/components/common/MentionInput.vue';

import ReadStatusBadge from '#/components/activity/ReadStatusBadge.vue';
import { AttachmentList } from '#/components/attachments';
import { renderMessageBody, type MentionInMessage } from '#/utils/mention-renderer';
// markMessageAsReadApi removed - unused

// Types
interface MessageUser {
  id: number;
  full_name: string;
  avatar_url: string | null;
}

interface MessageAttachment {
  filename: string;
  url: string;
  mime_type?: string;
  content_type?: string;
  size: number;
}

interface Message {
  id: number;
  model_name: string;
  record_id: number;
  user_id: number | null;
  parent_id: number | null;
  subject: string | null;
  body: string;
  body_html?: string | null;
  message_type: string;
  level: string;
  is_internal: boolean;
  is_pinned: boolean;
  attachments: MessageAttachment[];
  extra_data: Record<string, any>;
  created_at: string;
  updated_at: string | null;
  user?: MessageUser;
  mentions?: MentionInMessage[];
  replies?: Message[];
  reply_count?: number;
  is_thread_root?: boolean;
}

// Props
const props = withDefaults(
  defineProps<{
    message: Message;
    depth?: number;
    maxDepth?: number;
    readonly?: boolean;
    onReply?: (messageId: number) => void;
    onPin?: (messageId: number) => void;
    replyingTo?: number | null;
    submitting?: boolean;
    currentUserId?: number | null;
  }>(),
  {
    depth: 0,
    maxDepth: 5,
    readonly: false,
    replyingTo: null,
    submitting: false,
    currentUserId: null,
  },
);

// Computed
const isOwnMessage = computed(() => {
  return props.currentUserId !== null && props.message.user_id === props.currentUserId;
});

// Emits
const emit = defineEmits<{
  (e: 'reply', messageId: number): void;
  (e: 'pin', messageId: number): void;
  (e: 'submitReply', parentId: number, content: string): void;
  (e: 'cancelReply'): void;
}>();

// State
const collapsed = ref(false);
const replyContent = ref('');

// Computed
const hasReplies = computed(() => props.message.replies && props.message.replies.length > 0);
const replyCount = computed(() => props.message.reply_count || props.message.replies?.length || 0);
const canNest = computed(() => props.depth < props.maxDepth);
const isReplying = computed(() => props.replyingTo === props.message.id);

// Depth indicator available for future use
// const depthIndicator = computed(() => {
//   if (props.depth === 0) return '';
//   return '│ '.repeat(props.depth - 1) + '├─ ';
// });

const avatarSize = computed(() => {
  if (props.depth === 0) return 40;
  if (props.depth === 1) return 32;
  return 28;
});

// Message type colors
const messageTypeColors: Record<string, string> = {
  comment: 'blue',
  note: 'purple',
  system: 'default',
  notification: 'cyan',
  approval: 'green',
  rejection: 'red',
  assignment: 'orange',
};

// Methods
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

function toggleCollapse() {
  if (hasReplies.value) {
    collapsed.value = !collapsed.value;
  }
}

function handleReply() {
  emit('reply', props.message.id);
}

function handlePin() {
  emit('pin', props.message.id);
}

function submitReply() {
  if (replyContent.value.trim()) {
    emit('submitReply', props.message.id, replyContent.value);
    replyContent.value = '';
  }
}

function cancelReply() {
  replyContent.value = '';
  emit('cancelReply');
}
</script>

<template>
  <div
    :class="[
      'message-reply',
      `depth-${depth}`,
      { 'is-root': depth === 0 },
    ]"
    :style="{ marginLeft: depth > 0 ? `${depth * 24}px` : '0' }"
  >
    <!-- Thread depth indicator line -->
    <div v-if="depth > 0" class="thread-line" />

    <!-- Message content -->
    <div class="message-content">
      <!-- Header -->
      <div class="message-header">
        <div class="flex items-center gap-2">
          <Avatar :src="message.user?.avatar_url ?? undefined" :size="avatarSize">
            <template #icon>
              <UserOutlined />
            </template>
          </Avatar>
          <div class="flex flex-col">
            <span class="font-medium">{{ message.user?.full_name || 'System' }}</span>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <span>{{ formatTime(message.created_at) }}</span>
              <ReadStatusBadge
                v-if="isOwnMessage"
                :message-id="message.id"
                :is-own-message="isOwnMessage"
              />
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Collapse toggle for threads with replies -->
          <button
            v-if="hasReplies"
            type="button"
            class="thread-toggle"
            @click="toggleCollapse"
          >
            <component
              :is="collapsed ? RightOutlined : DownOutlined"
              class="h-4 w-4"
            />
            <span class="text-xs text-gray-500">{{ replyCount }} replies</span>
          </button>

          <Tag
            v-if="depth === 0"
            :color="messageTypeColors[message.message_type]"
            size="small"
          >
            {{ message.message_type }}
          </Tag>
          <Tag v-if="message.is_internal" size="small">Internal</Tag>
        </div>
      </div>

      <!-- Body -->
      <div
        class="message-body mt-2"
        v-html="message.body_html || renderMessageBody(message.body, message.mentions)"
      />

      <!-- Attachments -->
      <div v-if="message.attachments?.length" class="mt-2">
        <AttachmentList
          :attachments="message.attachments.map(a => ({
            filename: a.filename,
            url: a.url,
            mime_type: a.content_type || a.mime_type || 'application/octet-stream',
            size: a.size,
          }))"
          compact
          :max-visible="3"
        />
      </div>

      <!-- Reactions (provided by inbox module when installed) -->

      <!-- Actions -->
      <div v-if="!readonly" class="message-actions mt-2">
        <Button type="link" size="small" @click="handleReply">Reply</Button>
        <Button type="link" size="small" @click="handlePin">
          {{ message.is_pinned ? 'Unpin' : 'Pin' }}
        </Button>
      </div>

      <!-- Reply Form -->
      <div v-if="isReplying" class="reply-form mt-3">
        <MentionInput
          v-model="replyContent"
          :rows="2"
          placeholder="Write a reply... (Type @ to mention someone)"
          class="mb-2"
        />
        <div class="flex gap-2">
          <Button
            type="primary"
            size="small"
            :loading="submitting"
            @click="submitReply"
          >
            Reply
          </Button>
          <Button size="small" @click="cancelReply">Cancel</Button>
        </div>
      </div>
    </div>

    <!-- Nested Replies -->
    <div v-if="hasReplies && !collapsed && canNest" class="nested-replies mt-2">
      <MessageReply
        v-for="reply in message.replies"
        :key="reply.id"
        :message="reply"
        :depth="depth + 1"
        :max-depth="maxDepth"
        :readonly="readonly"
        :replying-to="replyingTo"
        :submitting="submitting"
        :current-user-id="currentUserId"
        @reply="$emit('reply', $event)"
        @pin="$emit('pin', $event)"
        @submit-reply="(parentId: number, content: string) => $emit('submitReply', parentId, content)"
        @cancel-reply="$emit('cancelReply')"
      />
    </div>

    <!-- Collapsed indicator -->
    <div v-if="hasReplies && collapsed" class="collapsed-indicator">
      <Button type="link" size="small" @click="collapsed = false">
        Show {{ replyCount }} {{ replyCount === 1 ? 'reply' : 'replies' }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.message-reply {
  position: relative;
  padding: 8px 0;
}

.message-reply.depth-0 {
  border-bottom: 1px solid var(--ant-color-border);
}

.message-reply.depth-0:last-child {
  border-bottom: none;
}

/* Thread line for nested replies */
.thread-line {
  position: absolute;
  left: -12px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--ant-color-border);
}

.message-reply:last-child .thread-line {
  height: 20px;
}

.message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.thread-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.thread-toggle:hover {
  background: var(--ant-color-bg-text-hover);
}

.message-body {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.message-body :deep(.mention) {
  color: var(--ant-color-primary);
  background: var(--ant-color-primary-bg);
  padding: 0 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.message-body :deep(.mention:hover) {
  background: var(--ant-color-primary-bg-hover);
  text-decoration: underline;
}

.message-actions {
  display: flex;
  gap: 8px;
}

.collapsed-indicator {
  margin-left: 24px;
  padding: 4px 0;
}

.nested-replies {
  margin-top: 8px;
}

.reply-form {
  padding: 12px;
  background: var(--ant-color-bg-container-disabled);
  border-radius: 8px;
}
</style>
