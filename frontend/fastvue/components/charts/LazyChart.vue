<script lang="ts" setup>
/**
 * Lazy-loaded ECharts Component
 *
 * This component provides a code-split wrapper for ECharts that:
 * - Dynamically imports echarts and vue-echarts only when rendered
 * - Reduces initial bundle size by ~1.9MB
 * - Shows loading skeleton while chart loads
 * - Handles resize automatically
 *
 * Usage:
 * ```vue
 * <LazyChart
 *   :option="chartOption"
 *   :loading="isLoading"
 *   height="400px"
 *   @chart-ready="onChartReady"
 * />
 * ```
 */
import {
  defineAsyncComponent,
  ref,
  shallowRef,
  type PropType,
} from 'vue';
import { Skeleton, Spin } from 'ant-design-vue';

// Lazy load the actual chart component
const VChart = defineAsyncComponent({
  loader: async () => {
    // Dynamically import echarts core and vue-echarts
    const [echarts, vueEcharts] = await Promise.all([
      import('echarts/core'),
      import('vue-echarts'),
    ]);

    // Import only the chart types we need
    const [
      { BarChart, LineChart, PieChart, ScatterChart, RadarChart },
      { GridComponent, TooltipComponent, LegendComponent, TitleComponent, DataZoomComponent },
      { CanvasRenderer },
    ] = await Promise.all([
      import('echarts/charts'),
      import('echarts/components'),
      import('echarts/renderers'),
    ]);

    // Register components
    echarts.use([
      BarChart,
      LineChart,
      PieChart,
      ScatterChart,
      RadarChart,
      GridComponent,
      TooltipComponent,
      LegendComponent,
      TitleComponent,
      DataZoomComponent,
      CanvasRenderer,
    ]);

    return vueEcharts.default;
  },
  loadingComponent: {
    template: '<div class="chart-loading"><Spin tip="Loading chart..." /></div>',
    components: { Spin },
  },
  delay: 200,
  timeout: 30000,
});

const props = defineProps({
  option: {
    type: Object as PropType<Record<string, any>>,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  height: {
    type: String,
    default: '400px',
  },
  width: {
    type: String,
    default: '100%',
  },
  autoresize: {
    type: Boolean,
    default: true,
  },
  theme: {
    type: String as PropType<'light' | 'dark'>,
    default: 'light',
  },
});

const emit = defineEmits<{
  (e: 'chart-ready', chart: any): void;
  (e: 'click', params: any): void;
}>();

const chartRef = shallowRef<any>(null);
const isChartLoaded = ref(false);

// Expose chart instance
function getChartInstance() {
  return chartRef.value;
}

// Handle chart ready
function handleChartReady() {
  isChartLoaded.value = true;
  if (chartRef.value) {
    emit('chart-ready', chartRef.value);
  }
}

// Handle click events
function handleClick(params: any) {
  emit('click', params);
}

// Expose methods
defineExpose({
  getChartInstance,
  resize: () => chartRef.value?.resize(),
  getDataURL: (opts?: any) => chartRef.value?.getDataURL(opts),
});
</script>

<template>
  <div
    class="lazy-chart-container"
    :style="{ height, width }"
  >
    <!-- Loading skeleton -->
    <div v-if="loading" class="chart-skeleton">
      <Skeleton active :paragraph="{ rows: 8 }" />
    </div>

    <!-- Chart -->
    <VChart
      v-else
      ref="chartRef"
      class="lazy-chart"
      :option="option"
      :autoresize="autoresize"
      :theme="theme"
      @click="handleClick"
      @finished="handleChartReady"
    />
  </div>
</template>

<style scoped>
.lazy-chart-container {
  position: relative;
}

.lazy-chart {
  width: 100%;
  height: 100%;
}

.chart-skeleton {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
}

.chart-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
}
</style>
