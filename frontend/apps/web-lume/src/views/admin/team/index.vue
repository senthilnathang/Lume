<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Card, Button, Table, Modal, Form, Input, message } from 'ant-design-vue';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import api from '@/api';

interface TeamMember {
  id: number;
  name: string;
  designation: string;
  message: string;
  status: string;
}

const teamMembers = ref<TeamMember[]>([]);
const loading = ref(true);
const modalVisible = ref(false);
const formData = ref({ name: '', designation: '', message: '', status: 'active' });

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Designation', dataIndex: 'designation', key: 'designation' },
  { title: 'Status', dataIndex: 'status', key: 'status' }
];

onMounted(async () => {
  try {
    const data = await api.get('/admin/team-members');
    teamMembers.value = data.members || [];
  } catch (error) {
    console.error('Failed to fetch team members:', error);
  } finally {
    loading.value = false;
  }
});

const openCreateModal = () => {
  formData.value = { name: '', designation: '', message: '', status: 'active' };
  modalVisible.value = true;
};

const handleSubmit = async () => {
  try {
    await api.post('/admin/team-members', formData.value);
    message.success('Team member added successfully');
    modalVisible.value = false;
  } catch (error) {
    message.error('Failed to add team member');
  }
};
</script>

<template>
  <div class="team-admin">
    <Card>
      <template #title>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Team Members</span>
          <Button type="primary" :icon="PlusOutlined" @click="openCreateModal">Add Team Member</Button>
        </div>
      </template>
      <Table :columns="columns" :dataSource="teamMembers" :loading="loading" :rowKey="'id'" :pagination="{ pageSize: 10 }" />
    </Card>
    <Modal v-model:open="modalVisible" title="Add Team Member" @ok="handleSubmit">
      <Form layout="vertical" :model="formData">
        <Form.Item label="Name" name="name" :rules="[{ required: true }]">
          <Input v-model:value="formData.name" placeholder="Full name" />
        </Form.Item>
        <Form.Item label="Designation" name="designation" :rules="[{ required: true }]">
          <Input v-model:value="formData.designation" placeholder="e.g., President, Secretary" />
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.team-admin { padding: 0; }
</style>
