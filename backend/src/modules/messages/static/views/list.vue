<script setup>
import { ref, onMounted, computed } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  List,
  Avatar,
  Tag,
  Space,
  Input,
  Select,
  SelectOption,
  Badge,
  message,
  Spin,
  Empty,
} from 'ant-design-vue';

import {
  PlusOutlined,
  SearchOutlined,
  InboxOutlined,
  SendOutlined,
  StarOutlined,
  DeleteOutlined,
  MailOutlined,
} from '@ant-design/icons-vue';

defineOptions({
  name: 'MessagesList',
});

const loading = ref(false);
const searchText = ref('');
const folder = ref('inbox');
const selectedMessage = ref(null);

const columns = [
  {
    title: 'From',
    key: 'from',
    width: 200,
  },
  {
    title: 'Subject',
    dataIndex: 'subject',
    key: 'subject',
  },
  {
    title: 'Date',
    dataIndex: 'date',
    key: 'date',
    width: 150,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 100,
  },
];

const messages = ref([
  {
    id: 1,
    from: { name: 'John Doe', email: 'john@example.com' },
    subject: 'Meeting Request',
    preview: 'Hi, I would like to schedule a meeting to discuss...',
    body: 'Hi,\n\nI would like to schedule a meeting to discuss the upcoming project. Please let me know your availability this week.\n\nBest regards,\nJohn',
    date: '2026-02-12',
    time: '10:30',
    folder: 'inbox',
    status: 'unread',
    starred: true,
  },
  {
    id: 2,
    from: { name: 'Sarah Smith', email: 'sarah@example.com' },
    subject: 'Project Update',
    preview: 'Here is the latest update on the project progress...',
    body: 'Hello,\n\nHere is the latest update on the project progress. We have completed the first phase and are moving to the next.\n\nRegards,\nSarah',
    date: '2026-02-11',
    time: '14:15',
    folder: 'inbox',
    status: 'read',
    starred: false,
  },
  {
    id: 3,
    from: { name: 'Mike Johnson', email: 'mike@example.com' },
    subject: 'RE: Budget Approval',
    preview: 'Thank you for the approval. I will proceed...',
    body: 'Thank you for the approval. I will proceed with the procurement process.\n\nThanks,\nMike',
    date: '2026-02-10',
    time: '09:00',
    folder: 'sent',
    status: 'read',
    starred: false,
  },
  {
    id: 4,
    from: { name: 'Emily Brown', email: 'emily@example.com' },
    subject: 'Volunteer Opportunity',
    preview: 'We have an exciting volunteer opportunity...',
    body: 'Hi there,\n\nWe have an exciting volunteer opportunity coming up next month. Would you like to participate?\n\nCheers,\nEmily',
    date: '2026-02-09',
    time: '16:45',
    folder: 'inbox',
    status: 'read',
    starred: true,
  },
  {
    id: 5,
    from: { name: 'David Wilson', email: 'david@example.com' },
    subject: 'Newsletter',
    preview: 'Check out our latest newsletter for updates...',
    body: 'Hello,\n\nCheck out our latest newsletter for updates on our programs and upcoming events.\n\nBest,\nDavid',
    date: '2026-02-08',
    time: '08:00',
    folder: 'inbox',
    status: 'read',
    starred: false,
  },
]);

const folders = [
  { key: 'inbox', label: 'Inbox', icon: InboxOutlined },
  { key: 'sent', label: 'Sent', icon: SendOutlined },
  { key: 'starred', label: 'Starred', icon: StarOutlined },
];

const filteredMessages = computed(() => {
  return messages.value.filter((msg) => {
    const matchesFolder = folder.value === 'starred' ? msg.starred : msg.folder === folder.value;
    const matchesSearch =
      !searchText.value ||
      msg.subject.toLowerCase().includes(searchText.value.toLowerCase()) ||
      msg.from.name.toLowerCase().includes(searchText.value.toLowerCase());
    return matchesFolder && matchesSearch;
  });
});

const unreadCount = computed(() => messages.value.filter((m) => m.folder === 'inbox' && m.status === 'unread').length);

function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function selectMessage(msg) {
  selectedMessage.value = msg;
  if (msg.status === 'unread') {
    msg.status = 'read';
  }
}

async function loadMessages() {
  loading.value = true;
  try {
    await new Promise((r) => setTimeout(r, 500));
  } finally {
    loading.value = false;
  }
}

function handleCompose() {
  message.info('Compose message dialog would open here');
}

function handleDelete(msg) {
  messages.value = messages.value.filter((m) => m.id !== msg.id);
  if (selectedMessage.value?.id === msg.id) {
    selectedMessage.value = null;
  }
  message.success('Message deleted');
}

onMounted(() => {
  loadMessages();
});
</script>

<template>
  <Page title="Messages" description="View and manage messages">
    <Spin :spinning="loading">
      <div class="flex gap-4" style="height: calc(100vh - 200px)">
        <Card class="w-80 flex-shrink-0" :body-style="{ padding: '12px' }">
          <Button type="primary" block class="mb-4" @click="handleCompose">
            <PlusOutlined />
            Compose
          </Button>

          <div class="folder-list">
            <div
              v-for="f in folders"
              :key="f.key"
              class="folder-item"
              :class="{ active: folder === f.key }"
              @click="folder = f.key"
            >
              <component :is="f.icon" />
              <span>{{ f.label }}</span>
              <Badge v-if="f.key === 'inbox'" :count="unreadCount" :offset="[10, 0]" />
            </div>
          </div>
        </Card>

        <Card class="flex-1" :body-style="{ padding: '0' }">
          <div v-if="!selectedMessage" class="p-8 text-center">
            <Empty description="Select a message to read" />
          </div>
          <div v-else class="p-4 h-full flex flex-col">
            <div class="flex justify-between items-start mb-4 border-b pb-4">
              <Space>
                <Avatar :style="{ backgroundColor: '#1890ff' }">
                  {{ getInitials(selectedMessage.from.name) }}
                </Avatar>
                <div>
                  <div class="font-medium">{{ selectedMessage.from.name }}</div>
                  <div class="text-sm text-gray-500">{{ selectedMessage.from.email }}</div>
                </div>
              </Space>
              <Space>
                <span class="text-sm text-gray-500">{{ selectedMessage.date }} {{ selectedMessage.time }}</span>
                <Button type="text" @click="selectedMessage.starred = !selectedMessage.starred">
                  <StarOutlined :style="{ color: selectedMessage.starred ? '#faad14' : undefined }" />
                </Button>
                <Button type="text" danger @click="handleDelete(selectedMessage)">
                  <DeleteOutlined />
                </Button>
              </Space>
            </div>
            <h3 class="text-lg font-medium mb-2">{{ selectedMessage.subject }}</h3>
            <div class="message-body flex-1 overflow-auto">
              <pre style="white-space: pre-wrap; font-family: inherit">{{ selectedMessage.body }}</pre>
            </div>
          </div>
        </Card>
      </div>
    </Spin>
  </Page>
</template>

<style scoped>
.folder-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.folder-item:hover {
  background: #f5f5f5;
}

.folder-item.active {
  background: #e6f7ff;
  color: #1890ff;
}

.w-80 {
  width: 320px;
}

.flex-shrink-0 {
  flex-shrink: 0;
}

.flex-1 {
  flex: 1;
}

.border-b {
  border-bottom: 1px solid #f0f0f0;
}

.pb-4 {
  padding-bottom: 16px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mb-2 {
  margin-bottom: 8px;
}

.font-medium {
  font-weight: 500;
}

.text-sm {
  font-size: 14px;
}

.text-lg {
  font-size: 18px;
}

.text-gray-500 {
  color: #6b7280;
}

.p-8 {
  padding: 32px;
}

.p-4 {
  padding: 16px;
}

.text-center {
  text-align: center;
}
</style>
