<script lang="ts" setup>
import { computed } from 'vue';
import { Tag } from 'ant-design-vue';

defineOptions({
  name: 'StatusTag',
});

type StatusType = 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed' | 'draft' | 'custom';

const props = withDefaults(
  defineProps<{
    status: StatusType | string;
    text?: string;
    color?: string;
  }>(),
  {
    status: 'custom',
  }
);

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
  const config = statusConfig[props.status.toLowerCase()];
  return config?.color || 'default';
});

const tagText = computed(() => {
  if (props.text) return props.text;
  const config = statusConfig[props.status.toLowerCase()];
  return config?.text || props.status;
});
</script>

<template>
  <Tag :color="tagColor">{{ tagText }}</Tag>
</template>
