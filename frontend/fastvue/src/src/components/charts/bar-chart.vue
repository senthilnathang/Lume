<script lang="ts" setup>
import type { EChartsOption } from 'echarts';

import { onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

interface Props {
  data: Array<{ name: string; value: number; color?: string }>;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: string;
  horizontal?: boolean;
  showLabel?: boolean;
  loading?: boolean;
  colors?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  xAxisLabel: '',
  yAxisLabel: '',
  height: '300px',
  horizontal: false,
  showLabel: true,
  loading: false,
  colors: () => ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'],
});

const chartRef = ref<InstanceType<typeof EchartsUI>>();
const { renderEcharts } = useEcharts(chartRef as any);

function getChartOptions(): EChartsOption {
  const categories = props.data.map((item) => item.name);
  const values = props.data.map((item) => item.value);
  const colors = props.data.map((item, index) => item.color || props.colors[index % props.colors.length]);

  const baseOptions: EChartsOption = {
    title: props.title
      ? {
          text: props.title,
          left: 'center',
          top: 10,
          textStyle: { fontSize: 14, fontWeight: 600 },
        }
      : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: props.title ? 50 : 20,
      containLabel: true,
    },
    xAxis: props.horizontal
      ? {
          type: 'value',
          name: props.xAxisLabel,
        }
      : {
          type: 'category',
          data: categories,
          name: props.xAxisLabel,
          axisLabel: {
            rotate: categories.length > 6 ? 45 : 0,
          },
        },
    yAxis: props.horizontal
      ? {
          type: 'category',
          data: categories,
          name: props.yAxisLabel,
        }
      : {
          type: 'value',
          name: props.yAxisLabel,
        },
    series: [
      {
        type: 'bar',
        data: values.map((value, index) => ({
          value,
          itemStyle: { color: colors[index] },
        })),
        label: props.showLabel
          ? {
              show: true,
              position: props.horizontal ? 'right' : 'top',
            }
          : undefined,
        barWidth: '60%',
      },
    ],
  };

  return baseOptions;
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
  <div class="bar-chart-wrapper" :class="{ 'bar-chart-loading': loading }">
    <EchartsUI ref="chartRef" :height="height" width="100%" />
    <div v-if="loading" class="chart-loading-overlay">
      <div class="chart-spinner"></div>
    </div>
  </div>
</template>

<style scoped>
.bar-chart-wrapper {
  position: relative;
}

.bar-chart-loading {
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
