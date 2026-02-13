<script lang="ts" setup>
import type { EChartsOption } from 'echarts';

import { onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

interface SeriesData {
  name: string;
  data: number[];
  color?: string;
  smooth?: boolean;
  areaStyle?: boolean;
}

interface Props {
  categories: string[];
  series: SeriesData[];
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: string;
  showArea?: boolean;
  smooth?: boolean;
  loading?: boolean;
  colors?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  xAxisLabel: '',
  yAxisLabel: '',
  height: '300px',
  showArea: false,
  smooth: true,
  loading: false,
  colors: () => ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'],
});

const chartRef = ref<InstanceType<typeof EchartsUI>>();
const { renderEcharts } = useEcharts(chartRef as any);

function getChartOptions(): EChartsOption {
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
      trigger: 'axis',
    },
    legend: {
      data: props.series.map((s) => s.name),
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: props.series.length > 1 ? 40 : 20,
      top: props.title ? 50 : 20,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.categories,
      name: props.xAxisLabel,
    },
    yAxis: {
      type: 'value',
      name: props.yAxisLabel,
    },
    series: props.series.map((s, index) => ({
      name: s.name,
      type: 'line',
      data: s.data,
      smooth: s.smooth ?? props.smooth,
      itemStyle: {
        color: s.color || props.colors[index % props.colors.length],
      },
      areaStyle: (s.areaStyle ?? props.showArea)
        ? {
            opacity: 0.3,
          }
        : undefined,
    })),
  };
}

function renderChart() {
  renderEcharts(getChartOptions());
}

onMounted(() => {
  renderChart();
});

watch(
  () => [props.categories, props.series],
  () => {
    renderChart();
  },
  { deep: true },
);
</script>

<template>
  <div class="line-chart-wrapper" :class="{ 'line-chart-loading': loading }">
    <EchartsUI ref="chartRef" :height="height" width="100%" />
    <div v-if="loading" class="chart-loading-overlay">
      <div class="chart-spinner"></div>
    </div>
  </div>
</template>

<style scoped>
.line-chart-wrapper {
  position: relative;
}

.line-chart-loading {
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
