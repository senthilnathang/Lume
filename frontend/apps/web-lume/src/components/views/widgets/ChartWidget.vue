<template>
  <div class="chart-widget">
    <p>Chart Widget ({{ widget.chartType || 'line' }})</p>
    <div class="chart-placeholder">📊</div>
    <p class="chart-note">Integrate with Chart.js or similar library</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  widget: any;
}>();
</script>

<style scoped>
.chart-widget {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 12px;
}

.chart-placeholder {
  font-size: 48px;
  margin: 10px 0;
}

.chart-note {
  margin: 5px 0 0;
  font-style: italic;
  color: #bbb;
}
</style>
