<script setup lang="ts">
const props = defineProps<{
  status: string;
  size?: 'sm' | 'md';
}>();

const statusConfig: Record<string, { bg: string; text: string; label?: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-700' },
  inactive: { bg: 'bg-red-100', text: 'text-red-700' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  approved: { bg: 'bg-green-100', text: 'text-green-700' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700' },
  draft: { bg: 'bg-gray-100', text: 'text-gray-600' },
  published: { bg: 'bg-blue-100', text: 'text-blue-700' },
  archived: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

const config = computed(() => statusConfig[props.status.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-600' });
const sizeClass = computed(() => props.size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs');
</script>

<template>
  <span class="inline-flex items-center font-medium rounded-full capitalize"
    :class="[config.bg, config.text, sizeClass]">
    {{ config.label || status }}
  </span>
</template>
