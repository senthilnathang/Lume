<template>
  <a-drawer
    v-model:open="columnSettings.showSettings.value"
    title="Column Settings"
    placement="right"
    :width="360"
    :closable="true"
    :mask-closable="true"
  >
    <div class="flex flex-col gap-2">
      <div
        v-for="(col, index) in columnSettings.allColumns.value"
        :key="col.key"
        class="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 transition-colors hover:border-blue-300 hover:bg-blue-50/30"
      >
        <div class="flex items-center gap-2 min-w-0">
          <a-checkbox
            :checked="col.visible !== false"
            @change="handleToggle(col.key)"
          />
          <span class="text-sm text-gray-700 truncate">{{ col.title }}</span>
        </div>

        <div class="flex items-center gap-1 flex-shrink-0">
          <a-button
            type="text"
            size="small"
            :disabled="index === 0"
            @click="handleMove(col.key, 'up')"
          >
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </template>
          </a-button>
          <a-button
            type="text"
            size="small"
            :disabled="index === columnSettings.allColumns.value.length - 1"
            @click="handleMove(col.key, 'down')"
          >
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </template>
          </a-button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <a-button @click="handleReset">Reset to Defaults</a-button>
        <a-button type="primary" @click="columnSettings.showSettings.value = false">Done</a-button>
      </div>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useColumnSettings, type Column } from '@/composables/useColumnSettings';

const props = defineProps<{
  viewKey: string;
  columns: Column[];
}>();

const emit = defineEmits<{
  (e: 'update:columns', columns: Column[]): void;
}>();

const columnSettings = useColumnSettings(props.viewKey, props.columns);

function handleToggle(key: string): void {
  columnSettings.toggleColumn(key);
  emit('update:columns', columnSettings.visibleColumns.value);
}

function handleMove(key: string, direction: 'up' | 'down'): void {
  columnSettings.moveColumn(key, direction);
  emit('update:columns', columnSettings.visibleColumns.value);
}

function handleReset(): void {
  columnSettings.resetColumns();
  emit('update:columns', columnSettings.visibleColumns.value);
}

// Emit initial visible columns on mount
watch(
  () => columnSettings.visibleColumns.value,
  (cols) => emit('update:columns', cols),
  { immediate: true }
);

defineExpose({
  open: () => { columnSettings.showSettings.value = true; },
  close: () => { columnSettings.showSettings.value = false; },
  showSettings: columnSettings.showSettings,
});
</script>
