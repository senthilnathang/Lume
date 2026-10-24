<template>
  <a-card :loading="loading">
    <a-statistic
      :title="title"
      :value="value"
      :value-style="{ color }"
      :precision="precision"
      :prefix="prefix"
      :suffix="suffix"
    >
      <template v-if="$slots.prefix" #prefix>
        <slot name="prefix" />
      </template>
      <template v-if="$slots.suffix" #suffix>
        <slot name="suffix" />
      </template>
    </a-statistic>
    <div v-if="trend !== undefined" class="stat-trend" :class="{ up: trend >= 0, down: trend < 0 }">
      {{ trend >= 0 ? '▲' : '▼' }} {{ Math.abs(trend) }}%
    </div>
  </a-card>
</template>
<script setup lang="ts">
defineOptions({ name: 'StatisticCard' });

withDefaults(defineProps<{
  title: string;
  value: number | string;
  color?: string;
  prefix?: string;
  suffix?: string;
  precision?: number;
  trend?: number;
  loading?: boolean;
}>(), {
  color: '#1890ff',
  precision: 0,
  loading: false,
});
</script>
<style scoped>
.stat-trend {
  font-size: 12px;
  margin-top: 4px;
}
.stat-trend.up {
  color: #52c41a;
}
.stat-trend.down {
  color: #ff4d4f;
}
</style>
