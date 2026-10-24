<template>
  <a-tag :color="tagColor">{{ tagText }}</a-tag>
</template>
<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ name: 'StatusTag' });

export type StatusType =
  | 'active' | 'inactive' | 'pending' | 'approved' | 'rejected'
  | 'cancelled' | 'completed' | 'draft' | 'custom';

const props = withDefaults(defineProps<{
  status: StatusType | string;
  text?: string;
  color?: string;
}>(), { status: 'custom' });

const statusConfig: Record<string, { color: string; text: string }> = {
  active: { color: 'green', text: 'Active' },
  inactive: { color: 'red', text: 'Inactive' },
  pending: { color: 'orange', text: 'Pending' },
  approved: { color: 'green', text: 'Approved' },
  rejected: { color: 'red', text: 'Rejected' },
  cancelled: { color: 'default', text: 'Cancelled' },
  completed: { color: 'blue', text: 'Completed' },
  draft: { color: 'default', text: 'Draft' },
  present: { color: 'green', text: 'Present' },
  absent: { color: 'red', text: 'Absent' },
  late: { color: 'orange', text: 'Late' },
  leave: { color: 'purple', text: 'On Leave' },
  holiday: { color: 'cyan', text: 'Holiday' },
  weekend: { color: 'default', text: 'Weekend' },
};

const tagColor = computed(() => {
  if (props.color) return props.color;
  return statusConfig[props.status.toLowerCase()]?.color || 'default';
});

const tagText = computed(() => {
  if (props.text) return props.text;
  return statusConfig[props.status.toLowerCase()]?.text || props.status;
});
</script>
