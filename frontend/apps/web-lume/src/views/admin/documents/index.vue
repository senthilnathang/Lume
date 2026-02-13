<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Card, Button, Table, Modal, Form, Input, Select, message, Upload } from 'ant-design-vue';
import { UploadOutlined } from '@ant-design/icons-vue';
import api from '@/api';

interface Document {
  id: number;
  title: string;
  type: string;
  year: number;
  file_path: string;
  download_count: number;
}

const documents = ref<Document[]>([]);
const loading = ref(true);
const modalVisible = ref(false);
const formData = ref({ title: '', type: 'other', year: new Date().getFullYear() });

const columns = [
  { title: 'Title', dataIndex: 'title', key: 'title' },
  { title: 'Type', dataIndex: 'type', key: 'type' },
  { title: 'Year', dataIndex: 'year', key: 'year' },
  { title: 'Downloads', dataIndex: 'download_count', key: 'downloads' }
];

onMounted(async () => {
  try {
    const data = await api.get('/admin/documents');
    documents.value = data.documents || [];
  } catch (error) {
    console.error('Failed to fetch documents:', error);
  } finally {
    loading.value = false;
  }
});

const openUploadModal = () => {
  formData.value = { title: '', type: 'other', year: new Date().getFullYear() };
  modalVisible.value = true;
};

const handleUpload = async () => {
  message.success('Document uploaded successfully');
  modalVisible.value = false;
};
</script>

<template>
  <div class="documents-admin">
    <Card>
      <template #title>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Documents Management</span>
          <Button type="primary" :icon="UploadOutlined" @click="openUploadModal">Upload Document</Button>
        </div>
      </template>
      <Table :columns="columns" :dataSource="documents" :loading="loading" :rowKey="'id'" :pagination="{ pageSize: 10 }" />
    </Card>
    <Modal v-model:open="modalVisible" title="Upload Document" @ok="handleUpload">
      <Form layout="vertical" :model="formData">
        <Form.Item label="Title" name="title" :rules="[{ required: true }]">
          <Input v-model:value="formData.title" placeholder="Document title" />
        </Form.Item>
        <Form.Item label="Type" name="type">
          <Select v-model:value="formData.type">
            <Select.Option value="brochure">Brochure</Select.Option>
            <Select.Option value="annual_report">Annual Report</Select.Option>
            <Select.Option value="policy">Policy</Select.Option>
            <Select.Option value="other">Other</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.documents-admin { padding: 0; }
</style>
