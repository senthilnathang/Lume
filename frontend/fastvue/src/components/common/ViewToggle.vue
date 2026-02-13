<script lang="ts" setup>
import { computed } from 'vue';
import { Button, Tooltip } from 'ant-design-vue';
import { AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons-vue';

defineOptions({
  name: 'ViewToggle',
});

type ViewMode = 'list' | 'card';

const props = withDefaults(
  defineProps<{
    modelValue: ViewMode;
  }>(),
  {
    modelValue: 'list',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: ViewMode): void;
  (e: 'change', value: ViewMode): void;
}>();

const isListView = computed(() => props.modelValue === 'list');
const isCardView = computed(() => props.modelValue === 'card');

function setViewMode(mode: ViewMode) {
  emit('update:modelValue', mode);
  emit('change', mode);
}
</script>

<template>
  <div class="view-toggle-group">
    <Tooltip title="List View">
      <Button
        :type="isListView ? 'primary' : 'default'"
        @click="setViewMode('list')"
      >
        <template #icon>
          <UnorderedListOutlined />
        </template>
      </Button>
    </Tooltip>
    <Tooltip title="Card View">
      <Button
        :type="isCardView ? 'primary' : 'default'"
        @click="setViewMode('card')"
      >
        <template #icon>
          <AppstoreOutlined />
        </template>
      </Button>
    </Tooltip>
  </div>
</template>

<style scoped>
.view-toggle-group {
  display: inline-flex;
  gap: 0;
}

.view-toggle-group :deep(.ant-btn) {
  border-radius: 0;
}

.view-toggle-group :deep(.ant-btn:first-child) {
  border-radius: 6px 0 0 6px;
}

.view-toggle-group :deep(.ant-btn:last-child) {
  border-radius: 0 6px 6px 0;
  margin-left: -1px;
}
</style>
