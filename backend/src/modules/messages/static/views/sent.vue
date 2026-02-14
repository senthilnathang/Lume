<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { Send, RefreshCw, Eye, Mail, Clock } from 'lucide-vue-next';
import type { ColumnsType } from 'ant-design-vue/es/table';
import { getMessages, getMessage, type Message } from '@modules/messages/static/api/index';

defineOptions({ name: 'SentMessagesView' });

const loading = ref(false);
const messages = ref<Message[]>([]);
const showDrawer = ref(false);
const selectedMessage = ref<Message | null>(null);
const drawerLoading = ref(false);

const columns: ColumnsType = [
  { title: 'Subject', dataIndex: 'subject', key: 'subject', ellipsis: true },
  { title: 'Recipient', dataIndex: 'recipient_email', key: 'recipient', width: 200, ellipsis: true },
  { title: 'Type', key: 'type', width: 100 },
  { title: 'Priority', key: 'priority', width: 90 },
  { title: 'Replied', key: 'replied_at', width: 140 },
  { title: 'Actions', key: 'actions', width: 70, fixed: 'right' },
];

const typeColors: Record<string, string> = {
  contact: 'blue', inquiry: 'cyan', support: 'orange', feedback: 'purple', other: 'default',
};
const priorityColors: Record<string, string> = {
  low: 'default', normal: 'blue', high: 'orange', urgent: 'red',
};

async function loadMessages() {
  loading.value = true;
  try {
    const res = await getMessages({ status: 'replied' });
    const data = Array.isArray(res) ? res : (res as any)?.data || (res as any)?.items || [];
    messages.value = data;
  } catch { messages.value = []; }
  finally { loading.value = false; }
}

async function viewMessage(msg: Message) {
  drawerLoading.value = true;
  showDrawer.value = true;
  try {
    const full = await getMessage(msg.id);
    selectedMessage.value = (full as any)?.data || full;
  } catch { selectedMessage.value = msg; }
  finally { drawerLoading.value = false; }
}

function formatDate(d?: string): string {
  if (!d) return '-';
  return new Date(d).toLocaleString();
}

function formatRelativeTime(d?: string): string {
  if (!d) return '-';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

onMounted(() => { loadMessages(); });
</script>

<template>
  <div class="sent-page p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2"><Send :size="24" /> Sent Messages</h1>
        <p class="text-gray-500 m-0">Messages that have been replied to</p>
      </div>
      <a-button @click="loadMessages" :loading="loading">
        <template #icon><RefreshCw :size="14" /></template>Refresh
      </a-button>
    </div>

    <a-table :columns="columns" :data-source="messages" :loading="loading" row-key="id" size="middle" :pagination="{ pageSize: 20 }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'type'">
          <a-tag :color="typeColors[record.type] || 'default'">{{ record.type }}</a-tag>
        </template>
        <template v-else-if="column.key === 'priority'">
          <a-tag :color="priorityColors[record.priority] || 'default'">{{ record.priority }}</a-tag>
        </template>
        <template v-else-if="column.key === 'replied_at'">
          <span class="text-sm text-gray-500">{{ formatRelativeTime(record.replied_at) }}</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-button size="small" @click="viewMessage(record)"><Eye :size="14" /></a-button>
        </template>
      </template>
    </a-table>

    <a-drawer v-model:open="showDrawer" title="Message Details" :width="500" :loading="drawerLoading">
      <template v-if="selectedMessage">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="Subject">{{ selectedMessage.subject || '(no subject)' }}</a-descriptions-item>
          <a-descriptions-item label="From">{{ selectedMessage.sender_name || selectedMessage.sender_email }}</a-descriptions-item>
          <a-descriptions-item label="To">{{ selectedMessage.recipient_email || '-' }}</a-descriptions-item>
          <a-descriptions-item label="Type"><a-tag :color="typeColors[selectedMessage.type] || 'default'">{{ selectedMessage.type }}</a-tag></a-descriptions-item>
          <a-descriptions-item label="Priority"><a-tag :color="priorityColors[selectedMessage.priority] || 'default'">{{ selectedMessage.priority }}</a-tag></a-descriptions-item>
          <a-descriptions-item label="Received">{{ formatDate(selectedMessage.created_at) }}</a-descriptions-item>
          <a-descriptions-item label="Replied">{{ formatDate(selectedMessage.replied_at) }}</a-descriptions-item>
        </a-descriptions>

        <div class="mt-4">
          <h4 class="font-medium mb-2 flex items-center gap-1"><Mail :size="14" /> Original Message</h4>
          <div class="bg-gray-50 p-4 rounded text-sm whitespace-pre-wrap">{{ selectedMessage.content }}</div>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
.sent-page { min-height: 100%; }
</style>
