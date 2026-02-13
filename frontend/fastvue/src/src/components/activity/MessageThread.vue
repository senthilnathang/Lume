<script lang="ts" setup>
/**
 * MessageThread Component
 *
 * Displays a thread of messages for any entity.
 * Supports posting new messages, replies, and attachments.
 * Now with full thread support including collapsible nested replies.
 */
import { computed, onMounted, ref, watch } from 'vue';

import {
  Button,
  Card,
  Empty,
  Form,
  message as antMessage,
  Spin,
  Tag,
} from 'ant-design-vue';
import {
  MessageOutlined,
  SendOutlined,
} from '@ant-design/icons-vue';

import { requestClient } from '#/api/request';
import MessageReply from '#/components/activity/MessageReply.vue';
import MentionInput from '#/components/common/MentionInput.vue';
import { type Attachment } from '#/components/attachments';
import { type MentionInMessage } from '#/utils/mention-renderer';
import { useUserStore } from '@vben/stores';

// Props
interface Props {
  modelName: string;
  recordId: number;
  readonly?: boolean;
  showPinnedOnly?: boolean;
  threaded?: boolean;
  maxDepth?: number;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  showPinnedOnly: false,
  threaded: true,
  maxDepth: 5,
});

// Emits
const emit = defineEmits<{
  (e: 'messagePosted', message: Message): void;
}>();

// Store
const userStore = useUserStore();
const currentUserId = computed(() => userStore.userInfo?.id || null);

// Types
interface MessageUser {
  id: number;
  full_name: string;
  avatar_url: string | null;
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

interface MessageAttachment extends Attachment {
  id?: number;
  content_type?: string;
}

// State
const loading = ref(false);
const submitting = ref(false);
const messages = ref<Message[]>([]);
const newMessage = ref('');
const replyingTo = ref<number | null>(null);
const replyContent = ref('');

// Message type colors used by MessageReply component
// const messageTypeColors: Record<string, string> = {
//   comment: 'blue', note: 'purple', system: 'default',
//   notification: 'cyan', approval: 'green', rejection: 'red', assignment: 'orange',
// };

// Computed
const displayMessages = computed(() => {
  if (props.showPinnedOnly) {
    return messages.value.filter((m) => m.is_pinned);
  }
  return messages.value;
});

const pinnedCount = computed(() => {
  return messages.value.filter((m) => m.is_pinned).length;
});

// Computed
const totalReplyCount = computed(() => {
  let count = 0;
  function countReplies(msgs: Message[]) {
    for (const msg of msgs) {
      count += msg.reply_count || 0;
      if (msg.replies) {
        countReplies(msg.replies);
      }
    }
  }
  countReplies(messages.value);
  return count;
});

// Methods
async function fetchMessages() {
  loading.value = true;
  try {
    if (props.threaded) {
      // Use threaded API for nested replies
      const response = await requestClient.get<Message[]>(
        `/messages/threaded/${props.modelName}/${props.recordId}`,
        {
          params: { max_depth: props.maxDepth },
        },
      );
      messages.value = response || [];
    } else {
      // Use flat API
      const params: Record<string, any> = {
        model_name: props.modelName,
        record_id: props.recordId,
      };

      const response = await requestClient.get<Message[]>('/messages/', {
        params,
      });
      messages.value = response || [];
    }
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    messages.value = [];
  } finally {
    loading.value = false;
  }
}

async function postMessage() {
  if (!newMessage.value.trim()) {
    return;
  }

  submitting.value = true;
  try {
    const response = await requestClient.post<Message>('/messages/', {
      model_name: props.modelName,
      record_id: props.recordId,
      body: newMessage.value,
      message_type: 'comment',
    });

    messages.value.unshift(response);
    newMessage.value = '';
    emit('messagePosted', response);
    antMessage.success('Message posted');
  } catch (error) {
    console.error('Failed to post message:', error);
    antMessage.error('Failed to post message');
  } finally {
    submitting.value = false;
  }
}

function findMessage(msgs: Message[], id: number): Message | null {
  for (const msg of msgs) {
    if (msg.id === id) return msg;
    if (msg.replies) {
      const found = findMessage(msg.replies, id);
      if (found) return found;
    }
  }
  return null;
}

async function postReply(parentId: number, content?: string) {
  const replyBody = content || replyContent.value;
  if (!replyBody.trim()) {
    return;
  }

  submitting.value = true;
  try {
    const response = await requestClient.post<Message>('/messages/', {
      model_name: props.modelName,
      record_id: props.recordId,
      parent_id: parentId,
      body: replyBody,
      message_type: 'comment',
    });

    // Find parent in nested structure and add reply
    const parent = findMessage(messages.value, parentId);
    if (parent) {
      if (!parent.replies) {
        parent.replies = [];
      }
      parent.replies.push(response);
      // Update reply count
      if (parent.reply_count !== undefined) {
        parent.reply_count++;
      }
    }

    replyContent.value = '';
    replyingTo.value = null;
    antMessage.success('Reply posted');
  } catch (error) {
    console.error('Failed to post reply:', error);
    antMessage.error('Failed to post reply');
  } finally {
    submitting.value = false;
  }
}

async function togglePin(messageId: number) {
  try {
    const msg = findMessage(messages.value, messageId);
    if (!msg) return;

    await requestClient.patch(`/messages/${messageId}`, {
      is_pinned: !msg.is_pinned,
    });

    msg.is_pinned = !msg.is_pinned;
    antMessage.success(msg.is_pinned ? 'Message pinned' : 'Message unpinned');
  } catch (error) {
    console.error('Failed to toggle pin:', error);
  }
}

function handleReply(messageId: number) {
  replyingTo.value = messageId;
  replyContent.value = '';
}

function handleSubmitReply(parentId: number, content: string) {
  postReply(parentId, content);
}

// formatTime and startReply are handled by MessageReply sub-component

function cancelReply() {
  replyingTo.value = null;
  replyContent.value = '';
}

// Lifecycle
onMounted(() => {
  fetchMessages();
});

// Watch for record changes
watch(
  () => [props.modelName, props.recordId],
  () => {
    fetchMessages();
  },
);

// Expose refresh method
defineExpose({ refresh: fetchMessages });
</script>

<template>
  <Card :bordered="false">
    <template #title>
      <div class="flex items-center justify-between">
        <span>
          <MessageOutlined class="mr-2" />
          Messages
          <Tag v-if="pinnedCount > 0" color="orange" size="small">
            {{ pinnedCount }} pinned
          </Tag>
          <Tag v-if="totalReplyCount > 0" color="blue" size="small">
            {{ totalReplyCount }} replies
          </Tag>
        </span>
        <span class="text-sm font-normal text-gray-500">
          {{ messages.length }} thread(s)
        </span>
      </div>
    </template>

    <!-- New Message Form -->
    <div v-if="!readonly" class="mb-4">
      <Form layout="vertical" @finish="postMessage">
        <Form.Item>
          <MentionInput
            v-model="newMessage"
            :rows="3"
            placeholder="Write a message... (Type @ to mention someone)"
            :disabled="submitting"
          />
        </Form.Item>
        <Form.Item class="mb-0">
          <div class="flex justify-end gap-2">
            <Button type="primary" html-type="submit" :loading="submitting">
              <template #icon>
                <SendOutlined />
              </template>
              Post Message
            </Button>
          </div>
        </Form.Item>
      </Form>
    </div>

    <Spin :spinning="loading">
      <Empty
        v-if="displayMessages.length === 0 && !loading"
        description="No messages yet"
      />

      <!-- Threaded display using MessageReply component -->
      <div v-else class="message-list">
        <MessageReply
          v-for="msg in displayMessages"
          :key="msg.id"
          :message="(msg as any)"
          :depth="0"
          :max-depth="maxDepth"
          :readonly="readonly"
          :replying-to="replyingTo"
          :submitting="submitting"
          :current-user-id="currentUserId"
          @reply="handleReply"
          @pin="togglePin"
          @submit-reply="handleSubmitReply"
          @cancel-reply="cancelReply"
        />
      </div>
    </Spin>
  </Card>
</template>

<style scoped>
.message-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
