<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Card, Table, Button, Statistic, Row, Col } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import api from '@/api';

interface Donation {
  id: number;
  amount: number;
  status: string;
  receipt_number: string;
  donated_at: string;
  donor?: { name: string };
  programme?: { title: string };
}

const donations = ref<Donation[]>([]);
const loading = ref(true);
const totalAmount = ref(0);

const columns = [
  { title: 'Receipt #', dataIndex: 'receipt_number', key: 'receipt_number' },
  { title: 'Donor', dataIndex: ['donor', 'name'], key: 'donor' },
  { title: 'Amount', dataIndex: 'amount', key: 'amount' },
  { title: 'Programme', dataIndex: ['programme', 'title'], key: 'programme' },
  { title: 'Date', dataIndex: 'donated_at', key: 'date' },
  { title: 'Status', dataIndex: 'status', key: 'status' }
];

onMounted(async () => {
  try {
    const data = await api.get('/admin/donations');
    donations.value = data.donations || [];
    totalAmount.value = data.totalAmount || 0;
  } catch (error) {
    console.error('Failed to fetch donations:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="donations-admin">
    <Row :gutter="24" style="margin-bottom: 24px;">
      <Col :xs="24" :sm="12">
        <Card><Statistic title="Total Donations" :value="totalAmount" prefix="₹" :valueStyle="{ color: '#2E7D32' }" /></Card>
      </Col>
      <Col :xs="24" :sm="12">
        <Card><Statistic title="Total Records" :value="donations.length" :valueStyle="{ color: '#1890FF' }" /></Card>
      </Col>
    </Row>
    <Card>
      <template #title>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Donations Management</span>
          <Button type="primary" :icon="PlusOutlined">Add Donation</Button>
        </div>
      </template>
      <Table :columns="columns" :dataSource="donations" :loading="loading" :rowKey="'id'" :pagination="{ pageSize: 10 }" />
    </Card>
  </div>
</template>

<style scoped>
.donations-admin { padding: 0; }
</style>
