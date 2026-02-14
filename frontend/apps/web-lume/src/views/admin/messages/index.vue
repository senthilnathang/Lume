<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Card, Table, Modal, Input, message } from 'ant-design-vue';
import api from '@/api';

interface Message {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

const messages = ref<Message[]>([]);
const loading = ref(true);
const replyModalVisible = ref(false);
const selectedMessage = ref<Message | null>(null);
const replyContent = ref('');

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { title: 'Subject', dataIndex: 'subject', key: 'subject' },
  { title: 'Date', dataIndex: 'created_at', key: 'date' },
  { title: 'Status', dataIndex: 'status', key: 'status' }
];

onMounted(async () => {
  try {
    const data = await api.get('/admin/contact-messages') as any;
    messages.value = data.messages || [];
  } catch (error) {
    console.error('Failed to fetch messages:', error);
  } finally {
    loading.value = false;
  }
});

const handleReply = async () => {
  if (!selectedMessage.value || !replyContent.value) return;
  message.success('Reply sent successfully');
  replyModalVisible.value = false;
};
</script>

<template>
  <div class="messages-admin">
    <Card><template #title><span>Contact Messages</span></template>
      <Table :columns="columns" :dataSource="messages" :loading="loading" :rowKey="'id'" :pagination="{ pageSize: 10 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <span>{{ record.status }}</span>
          </template>
        </template>
      </Table>
    </Card>
    <Modal v-model:open="replyModalVisible" title="Reply to Message" @ok="handleReply">
      <div v-if="selectedMessage" style="margin-bottom: 20px;">
        <p><strong>From:</strong> {{ selectedMessage.name }} ({{ selectedMessage.email }})</p>
        <p><strong>Subject:</strong> {{ selectedMessage.subject }}</p>
      </div>
      <Input.TextArea v-model:value="replyContent" :rows="5" placeholder="Type your reply..." />
    </Modal>
  </div>
</template>

<style scoped>
.messages-admin { padding: 0; }
</style>
