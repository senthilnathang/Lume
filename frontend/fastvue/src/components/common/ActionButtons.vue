<script lang="ts" setup>
import { Button, Popconfirm, Space, Tooltip } from 'ant-design-vue';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
} from '@ant-design/icons-vue';

defineOptions({
  name: 'ActionButtons',
});

const props = withDefaults(
  defineProps<{
    showView?: boolean;
    showEdit?: boolean;
    showDelete?: boolean;
    deleteConfirmTitle?: string;
    size?: 'small' | 'middle' | 'large';
    viewText?: string;
    editText?: string;
    deleteText?: string;
    showText?: boolean;
    disabled?: boolean;
  }>(),
  {
    showView: false,
    showEdit: true,
    showDelete: true,
    deleteConfirmTitle: 'Are you sure you want to delete this item?',
    size: 'small',
    viewText: 'View',
    editText: 'Edit',
    deleteText: '',
    showText: true,
    disabled: false,
  }
);

const emit = defineEmits<{
  (e: 'view'): void;
  (e: 'edit'): void;
  (e: 'delete'): void;
}>();
</script>

<template>
  <Space>
    <Tooltip v-if="showView" title="View">
      <Button type="link" :size="size" :disabled="disabled" @click="emit('view')">
        <template #icon><EyeOutlined /></template>
        <span v-if="showText">{{ viewText }}</span>
      </Button>
    </Tooltip>
    <Tooltip v-if="showEdit" title="Edit">
      <Button type="link" :size="size" :disabled="disabled" @click="emit('edit')">
        <template #icon><EditOutlined /></template>
        <span v-if="showText">{{ editText }}</span>
      </Button>
    </Tooltip>
    <Popconfirm
      v-if="showDelete"
      :title="deleteConfirmTitle"
      ok-text="Yes"
      cancel-text="No"
      @confirm="emit('delete')"
    >
      <Tooltip title="Delete">
        <Button type="link" :size="size" danger :disabled="disabled">
          <template #icon><DeleteOutlined /></template>
          <span v-if="showText && deleteText">{{ deleteText }}</span>
        </Button>
      </Tooltip>
    </Popconfirm>
    <slot />
  </Space>
</template>
