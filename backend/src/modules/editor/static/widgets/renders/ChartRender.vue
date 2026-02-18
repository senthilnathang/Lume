<template>
  <div class="lume-chart-render" :style="{ height: attrs.height || '300px' }">
    <canvas ref="canvasRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';

const props = defineProps<{ attrs: Record<string, any> }>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: any = null;

const labels = computed(() => {
  try { return JSON.parse(props.attrs.labels || '[]'); } catch { return []; }
});

const datasets = computed(() => {
  try { return JSON.parse(props.attrs.datasets || '[]'); } catch { return []; }
});

async function loadChartJs(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if ((window as any).Chart) return (window as any).Chart;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js';
    script.onload = () => resolve((window as any).Chart);
    document.head.appendChild(script);
  });
}

async function renderChart() {
  if (!canvasRef.value) return;
  const Chart = await loadChartJs();
  if (!Chart) return;
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  chartInstance = new Chart(canvasRef.value, {
    type: props.attrs.chartType || 'bar',
    data: { labels: labels.value, datasets: datasets.value },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: Number(props.attrs.aspectRatio) || 2,
      plugins: { legend: { display: props.attrs.showLegend !== false } },
      scales: props.attrs.chartType === 'pie' || props.attrs.chartType === 'doughnut' ? {} : {
        x: { grid: { display: props.attrs.showGrid !== false } },
        y: { grid: { display: props.attrs.showGrid !== false } },
      },
    },
  });
}

onMounted(() => renderChart());
watch(() => props.attrs, () => renderChart(), { deep: true });
</script>