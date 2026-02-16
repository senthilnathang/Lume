<script lang="ts" setup>
import { computed, h, onMounted, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import {
  MessageSquare,
  RefreshCw,
  Search,
  Eye,
  Trash2,
  AlertTriangle,
  Mail,
  MailOpen,
  Reply,
  Archive,
  Phone,
} from 'lucide-vue-next';

import {
  getMessages,
  getMessage,
  getMessageStats,
  updateMessage,
  replyToMessage,
  deleteMessage,
  type Message,
  type MessageStats,
} from '@modules/messages/static/api/index';
import { CompactEditor } from '@modules/editor/static/components/index';

defineOptions({ name: 'MessagesView' });

// State
const loading = ref(false);
const messages_ = ref<Message[]>([]);
const stats = ref<MessageStats>({ total: 0, unread: 0, replied: 0, archived: 0 });
const searchQuery = ref('');
const statusFilter = ref<string | undefined>(undefined);
const typeFilter = ref<string | undefined>(undefined);
const priorityFilter = ref<string | undefined>(undefined);

// View drawer
const showDrawer = ref(false);
const selectedMessage = ref<Message | null>(null);
const drawerLoading = ref(false);

// Reply modal
const showReplyModal = ref(false);
const replyContent = ref('');
const replyLoading = ref(false);
const replyingTo = ref<Message | null>(null);

// Computed
const filteredMessages = computed(() => {
  let result = messages_.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (m) =>
        m.subject?.toLowerCase().includes(q) ||
        m.sender_name?.toLowerCase().includes(q) ||
        m.sender_email?.toLowerCase().includes(q) ||
        m.content?.toLowerCase().includes(q),
    );
  }
  if (statusFilter.value) {
    result = result.filter((m) => m.status === statusFilter.value);
  }
  if (typeFilter.value) {
    result = result.filter((m) => m.type === typeFilter.value);
  }
  if (priorityFilter.value) {
    result = result.filter((m) => m.priority === priorityFilter.value);
  }
  return result;
});

// Table columns
const columns: ColumnsType = [
  { title: 'Message', key: 'message', width: 300 },
  { title: 'Sender', key: 'sender', width: 180 },
  { title: 'Type', key: 'type', width: 100 },
  { title: 'Priority', key: 'priority', width: 100 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Date', key: 'date', width: 140 },
  { title: 'Actions', key: 'actions', width: 130, fixed: 'right' },
];

const typeColors: Record<string, string> = {
  contact: 'blue',
  inquiry: 'cyan',
  support: 'orange',
  feedback: 'green',
  other: 'default',
};

const priorityColors: Record<string, string> = {
  low: 'default',
  normal: 'blue',
  high: 'orange',
  urgent: 'red',
};

const statusConfig: Record<string, { status: string; text: string }> = {
  new: { status: 'processing', text: 'New' },
  read: { status: 'default', text: 'Read' },
  replied: { status: 'success', text: 'Replied' },
  archived: { status: 'warning', text: 'Archived' },
};

// Methods
async function loadData() {
  loading.value = true;
  try {
    const [messagesRes, statsRes] = await Promise.allSettled([
      getMessages(),
      getMessageStats(),
    ]);
    if (messagesRes.status === 'fulfilled') {
      const res = messagesRes.value;
      messages_.value = Array.isArray(res) ? res : res?.data || [];
    }
    if (statsRes.status === 'fulfilled') {
      stats.value = statsRes.value;
    }
  } catch (error) {
    message.error('Failed to load messages');
    console.error('Failed to load messages:', error);
  } finally {
    loading.value = false;
  }
}

async function openView(msg: Message) {
  drawerLoading.value = true;
  showDrawer.value = true;
  try {
    const detail = await getMessage(msg.id);
    selectedMessage.value = detail;
    // Refresh stats since viewing marks as read
    if (msg.status === 'new') {
      const statsRes = await getMessageStats();
      stats.value = statsRes;
      // Update local list
      const idx = messages_.value.findIndex((m) => m.id === msg.id);
      if (idx !== -1) {
        messages_.value[idx] = { ...messages_.value[idx], status: 'read' };
      }
    }
  } catch {
    selectedMessage.value = msg;
  } finally {
    drawerLoading.value = false;
  }
}

function openReply(msg: Message) {
  replyingTo.value = msg;
  replyContent.value = '';
  showReplyModal.value = true;
}

async function handleReply() {
  if (!replyContent.value.trim()) {
    message.warning('Please enter a reply');
    return;
  }

  replyLoading.value = true;
  try {
    await replyToMessage(replyingTo.value!.id, { content: replyContent.value });
    message.success('Reply sent successfully');
    showReplyModal.value = false;
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Failed to send reply');
  } finally {
    replyLoading.value = false;
  }
}

async function handleArchive(msg: Message) {
  try {
    await updateMessage(msg.id, { status: 'archived' } as any);
    message.success('Message archived');
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Failed to archive');
  }
}

function handleDelete(msg: Message) {
  Modal.confirm({
    title: 'Delete Message',
    content: `Are you sure you want to delete this message from "${msg.sender_name || msg.sender_email}"?`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        await deleteMessage(msg.id);
        message.success('Message deleted');
        await loadData();
      } catch (error: any) {
        message.error(error?.message || 'Failed to delete');
      }
    },
  });
}

function formatRelativeTime(dateStr?: string | null) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="messages-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <MessageSquare :size="24" />
          Messages
        </h1>
        <p class="text-gray-500 m-0">View and respond to contact messages</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ stats.total }}</div>
            <div class="text-gray-500 text-sm">Total</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-500">{{ stats.unread }}</div>
            <div class="text-gray-500 text-sm">Unread</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ stats.replied }}</div>
            <div class="text-gray-500 text-sm">Replied</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-400">{{ stats.archived }}</div>
            <div class="text-gray-500 text-sm">Archived</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="6">
          <a-input v-model:value="searchQuery" placeholder="Search messages..." allow-clear>
            <template #prefix><Search :size="14" class="text-gray-400" /></template>
          </a-input>
        </a-col>
        <a-col :xs="24" :sm="6">
          <a-select v-model:value="statusFilter" placeholder="Status" allow-clear style="width: 100%">
            <a-select-option value="new">New</a-select-option>
            <a-select-option value="read">Read</a-select-option>
            <a-select-option value="replied">Replied</a-select-option>
            <a-select-option value="archived">Archived</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="6">
          <a-select v-model:value="typeFilter" placeholder="Type" allow-clear style="width: 100%">
            <a-select-option value="contact">Contact</a-select-option>
            <a-select-option value="inquiry">Inquiry</a-select-option>
            <a-select-option value="support">Support</a-select-option>
            <a-select-option value="feedback">Feedback</a-select-option>
            <a-select-option value="other">Other</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="6">
          <a-select v-model:value="priorityFilter" placeholder="Priority" allow-clear style="width: 100%">
            <a-select-option value="low">Low</a-select-option>
            <a-select-option value="normal">Normal</a-select-option>
            <a-select-option value="high">High</a-select-option>
            <a-select-option value="urgent">Urgent</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="filteredMessages"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <!-- Message -->
          <template v-if="column.key === 'message'">
            <div class="flex items-center gap-2">
              <Mail v-if="(record as Message).status === 'new'" :size="16" class="text-blue-500 flex-shrink-0" />
              <MailOpen v-else :size="16" class="text-gray-300 flex-shrink-0" />
              <div class="min-w-0">
                <div :class="['truncate', (record as Message).status === 'new' ? 'font-semibold' : 'font-medium']">
                  {{ (record as Message).subject || '(No subject)' }}
                </div>
                <div class="text-xs text-gray-400 truncate max-w-[260px]">
                  {{ (record as Message).content?.substring(0, 80) }}...
                </div>
              </div>
            </div>
          </template>

          <!-- Sender -->
          <template v-else-if="column.key === 'sender'">
            <div class="text-sm">
              <div class="font-medium">{{ (record as Message).sender_name || '-' }}</div>
              <div class="text-xs text-gray-400">{{ (record as Message).sender_email }}</div>
            </div>
          </template>

          <!-- Type -->
          <template v-else-if="column.key === 'type'">
            <a-tag :color="typeColors[(record as Message).type]">
              {{ (record as Message).type }}
            </a-tag>
          </template>

          <!-- Priority -->
          <template v-else-if="column.key === 'priority'">
            <a-tag :color="priorityColors[(record as Message).priority]">
              {{ (record as Message).priority }}
            </a-tag>
          </template>

          <!-- Status -->
          <template v-else-if="column.key === 'status'">
            <a-badge
              :status="(statusConfig[(record as Message).status] || statusConfig.new).status as any"
              :text="(statusConfig[(record as Message).status] || statusConfig.new).text"
            />
          </template>

          <!-- Date -->
          <template v-else-if="column.key === 'date'">
            <a-tooltip :title="formatDate((record as Message).created_at)">
              <span class="text-sm text-gray-500">
                {{ formatRelativeTime((record as Message).created_at) }}
              </span>
            </a-tooltip>
          </template>

          <!-- Actions -->
          <template v-else-if="column.key === 'actions'">
            <div class="actions-cell flex items-center gap-1">
              <a-tooltip title="View">
                <a-button type="text" size="small" @click="openView(record as Message)">
                  <template #icon><Eye :size="15" /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Reply">
                <a-button type="text" size="small" @click="openReply(record as Message)">
                  <template #icon><Reply :size="15" /></template>
                </a-button>
              </a-tooltip>
              <a-popconfirm title="Delete this message?" ok-text="Delete" ok-type="danger" @confirm="handleDelete(record as Message)">
                <a-tooltip title="Delete">
                  <a-button type="text" size="small" danger>
                    <template #icon><Trash2 :size="15" /></template>
                  </a-button>
                </a-tooltip>
              </a-popconfirm>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- View Drawer -->
    <a-drawer
      v-model:open="showDrawer"
      :title="selectedMessage?.subject || 'Message Details'"
      width="560"
      placement="right"
    >
      <a-spin :spinning="drawerLoading">
        <template v-if="selectedMessage">
          <div class="mb-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex items-center gap-2">
                <a-tag :color="typeColors[selectedMessage.type]">{{ selectedMessage.type }}</a-tag>
                <a-tag :color="priorityColors[selectedMessage.priority]">{{ selectedMessage.priority }}</a-tag>
                <a-badge
                  :status="(statusConfig[selectedMessage.status] || statusConfig.new).status as any"
                  :text="(statusConfig[selectedMessage.status] || statusConfig.new).text"
                />
              </div>
            </div>

            <!-- Sender info -->
            <a-card size="small" class="mb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Mail :size="18" class="text-blue-500" />
                </div>
                <div>
                  <div class="font-medium">{{ selectedMessage.sender_name || 'Unknown' }}</div>
                  <div class="text-xs text-gray-400">{{ selectedMessage.sender_email }}</div>
                  <div v-if="selectedMessage.sender_phone" class="text-xs text-gray-400 flex items-center gap-1">
                    <Phone :size="10" /> {{ selectedMessage.sender_phone }}
                  </div>
                </div>
                <div class="ml-auto text-xs text-gray-400">
                  {{ formatDate(selectedMessage.created_at) }}
                </div>
              </div>
            </a-card>

            <!-- Message content -->
            <div class="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 v-if="selectedMessage.subject" class="font-semibold mb-2">{{ selectedMessage.subject }}</h3>
              <div class="text-sm text-gray-700 whitespace-pre-wrap">{{ selectedMessage.content }}</div>
            </div>

            <a-descriptions :column="1" bordered size="small" class="mb-4">
              <a-descriptions-item v-if="selectedMessage.read_at" label="Read at">
                {{ formatDate(selectedMessage.read_at) }}
              </a-descriptions-item>
              <a-descriptions-item v-if="selectedMessage.replied_at" label="Replied at">
                {{ formatDate(selectedMessage.replied_at) }}
              </a-descriptions-item>
            </a-descriptions>
          </div>

          <div class="flex gap-2">
            <a-button type="primary" block @click="openReply(selectedMessage)">
              <template #icon><Reply :size="14" /></template>
              Reply
            </a-button>
            <a-button
              v-if="selectedMessage.status !== 'archived'"
              block
              @click="handleArchive(selectedMessage)"
            >
              <template #icon><Archive :size="14" /></template>
              Archive
            </a-button>
            <a-button block danger @click="handleDelete(selectedMessage)">
              <template #icon><Trash2 :size="14" /></template>
              Delete
            </a-button>
          </div>
        </template>
      </a-spin>
    </a-drawer>

    <!-- Reply Modal -->
    <a-modal
      v-model:open="showReplyModal"
      :title="`Reply to ${replyingTo?.sender_name || replyingTo?.sender_email || ''}`"
      :confirm-loading="replyLoading"
      @ok="handleReply"
      ok-text="Send Reply"
      width="500px"
    >
      <div class="mt-4">
        <div v-if="replyingTo" class="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-600">
          <div class="font-medium mb-1">{{ replyingTo.subject || '(No subject)' }}</div>
          <div class="text-xs text-gray-400 truncate">{{ replyingTo.content?.substring(0, 150) }}...</div>
        </div>
        <CompactEditor v-model="replyContent" placeholder="Type your reply..." min-height="150px" />
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.messages-page {
  min-height: 100%;
}

.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

:deep(.ant-descriptions-item-label) {
  font-weight: 500;
  color: #6b7280;
}

:deep(.actions-cell .ant-btn) {
  opacity: 0.55;
  transition: opacity 0.15s;
}
:deep(.ant-table-row:hover .actions-cell .ant-btn) {
  opacity: 1;
}
</style>
