<script setup lang="ts">
import { ref, computed } from 'vue';
import { Card, Statistic, Row, Col, Table, Tag } from 'ant-design-vue';

interface Stats {
  totalProgrammes: number;
  totalActivities: number;
  totalDonors: number;
  totalDonations: number;
  totalDonationAmount: number;
  thisMonthDonations: number;
  newContactMessages: number;
  totalBeneficiaries: number;
}

const stats = ref<Stats | null>(null);
const loading = ref(true);

const statCards = computed(() => [
  { title: 'Total Programmes', value: stats.value?.totalProgrammes || 0, icon: '📋', color: '#2E7D32' },
  { title: 'Total Activities', value: stats.value?.totalActivities || 0, icon: '📸', color: '#1890FF' },
  { title: 'Total Donors', value: stats.value?.totalDonors || 0, icon: '👥', color: '#722ED1' },
  { title: 'Total Beneficiaries', value: stats.value?.totalBeneficiaries || 0, icon: '❤️', color: '#EB2F96' }
]);

const columns = [
  { title: 'Donor', dataIndex: ['donor', 'name'], key: 'donor' },
  { title: 'Amount', dataIndex: 'amount', key: 'amount' },
  { title: 'Date', dataIndex: 'donated_at', key: 'date' },
  { title: 'Status', dataIndex: 'status', key: 'status' }
];
</script>

<template>
  <div class="dashboard-page">
    <Row :gutter="[24, 24]">
      <Col v-for="stat in statCards" :key="stat.title" :xs="24" :sm="12" :lg="6">
        <Card class="stat-card" :bordered="false">
          <div class="stat-content">
            <div class="stat-icon" :style="{ background: stat.color + '15', color: stat.color }">
              {{ stat.icon }}
            </div>
            <div class="stat-info">
              <Statistic :value="stat.value" :title="stat.title" />
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  </div>
</template>

<style scoped>
.dashboard-page { padding: 0; }
.stat-card { border-radius: 8px; transition: all 0.3s ease; }
.stat-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.stat-content { display: flex; align-items: center; gap: 20px; }
.stat-icon { width: 64px; height: 64px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 28px; }
</style>
