<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Card, Col, Row, Statistic } from 'ant-design-vue';
import {
  BarChartOutlined,
  RiseOutlined,
  TeamOutlined,
  TrophyOutlined,
} from '@ant-design/icons-vue';

import { requestClient } from '#/api/request';

defineOptions({
  name: 'RECRUITMENTDashboard',
});

// Statistics
const stats = ref({
  total: 0,
  active: 0,
  thisMonth: 0,
  growth: 0,
});

const loading = ref(false);

async function fetchStats() {
  loading.value = true;
  try {
    // Fetch dashboard statistics from API
    // const response = await requestClient.get('/recruitment/stats');
    // stats.value = response;
  } catch (error) {
    console.error('Failed to fetch stats:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchStats();
});
</script>

<template>
  <Page
    title="RECRUITMENT Dashboard"
    description="Overview and analytics"
  >
    <Row :gutter="[16, 16]">
      <Col :xs="24" :sm="12" :lg="6">
        <Card :loading="loading">
          <Statistic title="Total Records" :value="stats.total">
            <template #prefix>
              <BarChartOutlined />
            </template>
          </Statistic>
        </Card>
      </Col>
      <Col :xs="24" :sm="12" :lg="6">
        <Card :loading="loading">
          <Statistic title="Active" :value="stats.active" value-style="{ color: '#3f8600' }">
            <template #prefix>
              <TeamOutlined />
            </template>
          </Statistic>
        </Card>
      </Col>
      <Col :xs="24" :sm="12" :lg="6">
        <Card :loading="loading">
          <Statistic title="This Month" :value="stats.thisMonth">
            <template #prefix>
              <TrophyOutlined />
            </template>
          </Statistic>
        </Card>
      </Col>
      <Col :xs="24" :sm="12" :lg="6">
        <Card :loading="loading">
          <Statistic title="Growth" :value="stats.growth" suffix="%">
            <template #prefix>
              <RiseOutlined />
            </template>
          </Statistic>
        </Card>
      </Col>
    </Row>

    <Row :gutter="[16, 16]" class="mt-4">
      <Col :span="24">
        <Card title="Recent Activity">
          <p class="text-gray-500">Dashboard charts and activity feed will be displayed here.</p>
        </Card>
      </Col>
    </Row>
  </Page>
</template>
