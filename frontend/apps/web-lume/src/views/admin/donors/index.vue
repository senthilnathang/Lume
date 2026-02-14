<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Card, Table, Button } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import api from '@/api';

interface Donor {
  id: number;
  name: string;
  email: string;
  phone: string;
  type: string;
  total_donations: number;
  status: string;
}

const donors = ref<Donor[]>([]);
const loading = ref(true);

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { title: 'Type', dataIndex: 'type', key: 'type' },
  { title: 'Total Donations', dataIndex: 'total_donations', key: 'total_donations' }
];

onMounted(async () => {
  try {
    const data = await api.get('/admin/donors') as any;
    donors.value = data.donors || [];
  } catch (error) {
    console.error('Failed to fetch donors:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="donors-admin">
    <Card>
      <template #title>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Donors Management</span>
          <Button type="primary" :icon="PlusOutlined">Add Donor</Button>
        </div>
      </template>
      <Table :columns="columns" :dataSource="donors" :loading="loading" :rowKey="'id'" :pagination="{ pageSize: 10 }" />
    </Card>
  </div>
</template>

<style scoped>
.donors-admin { padding: 0; }
</style>
