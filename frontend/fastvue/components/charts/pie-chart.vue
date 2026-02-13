<script lang="ts" setup>
import type { EChartsOption } from 'echarts';

import { onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

interface Props {
  data: Array<{ name: string; value: number; color?: string }>;
  title?: string;
  height?: string;
  showLegend?: boolean;
  showLabel?: boolean;
  doughnut?: boolean;
  roseType?: 'area' | 'radius' | false;
  loading?: boolean;
  colors?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  height: '300px',
  showLegend: true,
  showLabel: true,
  doughnut: false,
  roseType: false,
  loading: false,
  colors: () => ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'],
});

const chartRef = ref<InstanceType<typeof EchartsUI>>();
const { renderEcharts } = useEcharts(chartRef as any);

function getChartOptions(): EChartsOption {
  const coloredData = props.data.map((item, index) => ({
    ...item,
    itemStyle: {
      color: item.color || props.colors[index % props.colors.length],
    },
  }));

  return {
    title: props.title
      ? {
          text: props.title,
          left: 'center',
          top: 10,
          textStyle: { fontSize: 14, fontWeight: 600 },
        }
      : undefined,
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: props.showLegend
      ? {
          orient: 'horizontal',
          bottom: 0,
          data: props.data.map((item) => item.name),
        }
      : undefined,
    series: [
      {
        type: 'pie',
        radius: props.doughnut ? ['40%', '70%'] : '70%',
        center: ['50%', props.showLegend ? '45%' : '50%'],
        roseType: props.roseType || undefined,
        data: coloredData,
        label: props.showLabel
          ? {
              show: true,
              formatter: '{b}: {d}%',
            }
          : { show: false },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };
}

function renderChart() {
  renderEcharts(getChartOptions());
}

onMounted(() => {
  renderChart();
});

watch(
  () => props.data,
  () => {
    renderChart();
  },
  { deep: true },
);
</script>

<template>
  <div class="pie-chart-wrapper" :class="{ 'pie-chart-loading': loading }">
    <EchartsUI ref="chartRef" :height="height" width="100%" />
    <div v-if="loading" class="chart-loading-overlay">
      <div class="chart-spinner"></div>
    </div>
  </div>
</template>

<style scoped>
.pie-chart-wrapper {
  position: relative;
}

.pie-chart-loading {
  opacity: 0.6;
}

.chart-loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.5);
}

.chart-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
