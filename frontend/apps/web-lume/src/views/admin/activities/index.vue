<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Card, Button, Table, Modal, Form, Input, message, Select } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import api from '@/api';

interface Activity {
  id: number;
  title: string;
  description: string;
  activity_date: string;
  location: string;
  status: string;
  programme?: { title: string };
}

const activities = ref<Activity[]>([]);
const loading = ref(true);
const modalVisible = ref(false);
const formData = ref({
  title: '', description: '', activity_date: '', location: '', status: 'draft'
});

const columns = [
  { title: 'Date', dataIndex: 'activity_date', key: 'activity_date' },
  { title: 'Title', dataIndex: 'title', key: 'title' },
  { title: 'Location', dataIndex: 'location', key: 'location' },
  { title: 'Status', dataIndex: 'status', key: 'status' }
];

onMounted(async () => {
  try {
    const data = await api.get('/admin/activities') as any;
    activities.value = data.activities || [];
  } catch (error) {
    console.error('Failed to fetch activities:', error);
  } finally {
    loading.value = false;
  }
});

const openCreateModal = () => {
  formData.value = { title: '', description: '', activity_date: '', location: '', status: 'draft' };
  modalVisible.value = true;
};

const handleSubmit = async () => {
  try {
    await api.post('/admin/activities', formData.value);
    message.success('Activity saved successfully');
    modalVisible.value = false;
  } catch (error) {
    message.error('Failed to save activity');
  }
};
</script>

<template>
  <div class="activities-admin">
    <Card>
      <template #title>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Activities Management</span>
          <Button type="primary" :icon="PlusOutlined" @click="openCreateModal">Add Activity</Button>
        </div>
      </template>
      <Table :columns="columns" :dataSource="activities" :loading="loading" :rowKey="'id'" :pagination="{ pageSize: 10 }" />
    </Card>
    <Modal v-model:open="modalVisible" title="Add Activity" @ok="handleSubmit">
      <Form layout="vertical" :model="formData">
        <Form.Item label="Title" name="title" :rules="[{ required: true }]">
          <Input v-model:value="formData.title" placeholder="Activity title" />
        </Form.Item>
        <Form.Item label="Status" name="status">
          <Select v-model:value="formData.status">
            <Select.Option value="draft">Draft</Select.Option>
            <Select.Option value="published">Published</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.activities-admin { padding: 0; }
</style>
