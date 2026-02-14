<script lang="ts" setup>
import { onMounted, ref, computed } from 'vue';
import { BarChart3, RefreshCw, DollarSign, Users, TrendingUp, Hash } from 'lucide-vue-next';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, PieChart, BarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import { getDonationStats, getDonations, getCampaigns, type Donation, type Campaign, type DonationStats } from '@/api/donations';

use([CanvasRenderer, LineChart, PieChart, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent]);

defineOptions({ name: 'DonationReportsView' });

const loading = ref(false);
const stats = ref<DonationStats>({ total: 0, totalAmount: 0, completed: 0, pending: 0 });
const donations = ref<Donation[]>([]);
const campaigns = ref<Campaign[]>([]);

async function loadData() {
  loading.value = true;
  try {
    const [statsRes, donationsRes, campaignsRes] = await Promise.allSettled([
      getDonationStats(),
      getDonations({ limit: 500 }),
      getCampaigns(),
    ]);
    if (statsRes.status === 'fulfilled') {
      const s = statsRes.value;
      stats.value = (s as any)?.data || s || { total: 0, totalAmount: 0, completed: 0, pending: 0 };
    }
    if (donationsRes.status === 'fulfilled') {
      const d = donationsRes.value;
      donations.value = Array.isArray(d) ? d : (d as any)?.data || (d as any)?.items || [];
    }
    if (campaignsRes.status === 'fulfilled') {
      const c = campaignsRes.value;
      campaigns.value = Array.isArray(c) ? c : (c as any)?.data || [];
    }
  } catch { /* stats remain default */ }
  finally { loading.value = false; }
}

const avgDonation = computed(() => {
  if (!stats.value.total) return 0;
  return Math.round((stats.value.totalAmount / stats.value.total) * 100) / 100;
});

const uniqueDonors = computed(() => {
  const ids = new Set(donations.value.map(d => d.donor_id).filter(Boolean));
  return ids.size;
});

// Monthly donations chart
const monthlyChartOption = computed(() => {
  const monthly: Record<string, { count: number; amount: number }> = {};
  for (const d of donations.value) {
    const date = d.created_at || d.updated_at;
    if (!date) continue;
    const key = date.slice(0, 7); // YYYY-MM
    if (!monthly[key]) monthly[key] = { count: 0, amount: 0 };
    monthly[key].count++;
    monthly[key].amount += d.amount || 0;
  }
  const sorted = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b));
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Count', 'Amount ($)'] },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: sorted.map(([k]) => k) },
    yAxis: [
      { type: 'value', name: 'Count', position: 'left' },
      { type: 'value', name: 'Amount', position: 'right' },
    ],
    series: [
      { name: 'Count', type: 'line', data: sorted.map(([, v]) => v.count), smooth: true, itemStyle: { color: '#1890ff' } },
      { name: 'Amount ($)', type: 'line', yAxisIndex: 1, data: sorted.map(([, v]) => Math.round(v.amount)), smooth: true, itemStyle: { color: '#52c41a' } },
    ],
  };
});

// Payment methods pie chart
const paymentChartOption = computed(() => {
  const methods: Record<string, number> = {};
  for (const d of donations.value) {
    const method = d.payment_method || 'other';
    methods[method] = (methods[method] || 0) + 1;
  }
  const colors: Record<string, string> = {
    cash: '#52c41a', cheque: '#1890ff', bank_transfer: '#722ed1',
    online: '#13c2c2', other: '#8c8c8c',
  };
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center' },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      label: { show: false },
      data: Object.entries(methods).map(([name, value]) => ({
        name: name.replace('_', ' '), value,
        itemStyle: { color: colors[name] || '#8c8c8c' },
      })),
    }],
  };
});

// Campaign performance bar chart
const campaignChartOption = computed(() => {
  const active = campaigns.value.filter(c => c.goal_amount && c.goal_amount > 0).slice(0, 10);
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Goal', 'Raised'] },
    grid: { left: 50, right: 20, top: 40, bottom: 60 },
    xAxis: {
      type: 'category',
      data: active.map(c => c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name),
      axisLabel: { rotate: 30, fontSize: 10 },
    },
    yAxis: { type: 'value', name: 'Amount ($)' },
    series: [
      { name: 'Goal', type: 'bar', data: active.map(c => c.goal_amount || 0), itemStyle: { color: '#bae7ff' } },
      { name: 'Raised', type: 'bar', data: active.map(c => c.raised_amount || 0), itemStyle: { color: '#1890ff' } },
    ],
  };
});

// Status distribution bar chart
const statusChartOption = computed(() => {
  const statuses: Record<string, number> = {};
  for (const d of donations.value) {
    statuses[d.status] = (statuses[d.status] || 0) + 1;
  }
  const colors: Record<string, string> = {
    completed: '#52c41a', pending: '#faad14', failed: '#ff4d4f', refunded: '#722ed1',
  };
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: Object.keys(statuses) },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar', data: Object.entries(statuses).map(([name, value]) => ({
        value, itemStyle: { color: colors[name] || '#8c8c8c' },
      })),
    }],
  };
});

onMounted(() => { loadData(); });
</script>

<template>
  <div class="reports-page p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2"><BarChart3 :size="24" /> Donation Reports</h1>
        <p class="text-gray-500 m-0">Analytics and insights for donation activity</p>
      </div>
      <a-button @click="loadData" :loading="loading">
        <template #icon><RefreshCw :size="14" /></template>Refresh
      </a-button>
    </div>

    <!-- Stats Cards -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="12" :sm="6">
        <a-card size="small">
          <a-statistic title="Total Donations" :value="stats.total" :loading="loading">
            <template #prefix><Hash :size="16" class="text-blue-500" /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small">
          <a-statistic title="Total Amount" :value="stats.totalAmount" :precision="2" prefix="$" :loading="loading">
            <template #prefix><DollarSign :size="16" class="text-green-500" /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small">
          <a-statistic title="Average Donation" :value="avgDonation" :precision="2" prefix="$" :loading="loading">
            <template #prefix><TrendingUp :size="16" class="text-orange-500" /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small">
          <a-statistic title="Unique Donors" :value="uniqueDonors" :loading="loading">
            <template #prefix><Users :size="16" class="text-purple-500" /></template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- Charts Row 1 -->
    <a-row :gutter="[16, 16]" class="mb-4">
      <a-col :xs="24" :lg="16">
        <a-card title="Donations Over Time" size="small" :loading="loading">
          <VChart v-if="donations.length" :option="monthlyChartOption" style="height: 300px" autoresize />
          <a-empty v-else description="No donation data" />
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="8">
        <a-card title="Payment Methods" size="small" :loading="loading">
          <VChart v-if="donations.length" :option="paymentChartOption" style="height: 300px" autoresize />
          <a-empty v-else description="No data" />
        </a-card>
      </a-col>
    </a-row>

    <!-- Charts Row 2 -->
    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :lg="12">
        <a-card title="Campaign Performance" size="small" :loading="loading">
          <VChart v-if="campaigns.length" :option="campaignChartOption" style="height: 300px" autoresize />
          <a-empty v-else description="No campaign data" />
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12">
        <a-card title="Status Distribution" size="small" :loading="loading">
          <VChart v-if="donations.length" :option="statusChartOption" style="height: 300px" autoresize />
          <a-empty v-else description="No data" />
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
.reports-page { min-height: 100%; }
</style>
