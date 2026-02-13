<script setup lang="ts">
const props = defineProps<{
  level: string;
  score: number;
}>();

const levelConfig: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: 'text-green-700', bg: 'bg-green-500', label: 'Critical Trust' },
  high: { color: 'text-blue-700', bg: 'bg-blue-500', label: 'High Trust' },
  medium: { color: 'text-yellow-700', bg: 'bg-yellow-500', label: 'Medium Trust' },
  low: { color: 'text-orange-700', bg: 'bg-orange-500', label: 'Low Trust' },
  none: { color: 'text-red-700', bg: 'bg-red-500', label: 'No Trust' },
};

const config = computed(() => levelConfig[props.level] || levelConfig.none);
</script>

<template>
  <div class="flex items-center gap-3">
    <div class="flex-1">
      <div class="flex items-center justify-between mb-1">
        <span class="text-sm font-medium" :class="config.color">{{ config.label }}</span>
        <span class="text-xs text-gray-500">{{ score }}/100</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div class="h-2 rounded-full transition-all duration-500" :class="config.bg"
          :style="{ width: `${score}%` }" />
      </div>
    </div>
  </div>
</template>
