<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import {
  Button,
  Divider,
  Drawer,
  Space,
  Switch,
  Tooltip,
} from 'ant-design-vue';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  MenuOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue';

defineOptions({
  name: 'ColumnSettings',
});

// Types
export interface ColumnConfig {
  key: string;
  title: string;
  visible: boolean;
  fixed?: 'left' | 'right' | boolean;
  required?: boolean; // Cannot be hidden
  width?: number | string;
}

// Props
const props = withDefaults(
  defineProps<{
    columns: ColumnConfig[];
    storageKey?: string;
    title?: string;
    buttonText?: string;
    showButton?: boolean;
    drawerWidth?: number | string;
  }>(),
  {
    title: 'Column Settings',
    buttonText: 'Columns',
    showButton: true,
    drawerWidth: 320,
  }
);

// Emits
const emit = defineEmits<{
  (e: 'update:columns', columns: ColumnConfig[]): void;
  (e: 'change', columns: ColumnConfig[]): void;
  (e: 'reset'): void;
}>();

// State
const drawerVisible = ref(false);
const localColumns = ref<ColumnConfig[]>([...props.columns]);

// Computed
const visibleCount = computed(() =>
  localColumns.value.filter(c => c.visible).length
);

const totalCount = computed(() => localColumns.value.length);

const allVisible = computed(() =>
  localColumns.value.every(c => c.visible || c.required)
);

// Methods
function openDrawer() {
  drawerVisible.value = true;
}

function closeDrawer() {
  drawerVisible.value = false;
}

function toggleVisibility(column: ColumnConfig) {
  if (column.required) return;
  column.visible = !column.visible;
  emitChange();
}

function toggleAll() {
  const newVisibility = !allVisible.value;
  localColumns.value.forEach(col => {
    if (!col.required) {
      col.visible = newVisibility;
    }
  });
  emitChange();
}

function resetToDefault() {
  localColumns.value = [...props.columns].map(c => ({
    ...c,
    visible: true,
  }));
  emitChange();
  emit('reset');

  // Clear localStorage if using persistence
  if (props.storageKey) {
    localStorage.removeItem(props.storageKey);
  }
}

function emitChange() {
  emit('update:columns', [...localColumns.value]);
  emit('change', [...localColumns.value]);

  // Persist to localStorage if storageKey provided
  if (props.storageKey) {
    saveToStorage();
  }
}

function saveToStorage() {
  if (!props.storageKey) return;

  const data = localColumns.value.map(c => ({
    key: c.key,
    visible: c.visible,
  }));
  localStorage.setItem(props.storageKey, JSON.stringify(data));
}

function loadFromStorage() {
  if (!props.storageKey) return;

  const stored = localStorage.getItem(props.storageKey);
  if (!stored) return;

  try {
    const data = JSON.parse(stored) as { key: string; visible: boolean }[];
    const keyOrderMap = new Map(data.map((item, index) => [item.key, { index, visible: item.visible }]));

    // Reorder and set visibility based on stored data
    localColumns.value.sort((a, b) => {
      const aOrder = keyOrderMap.get(a.key)?.index ?? 999;
      const bOrder = keyOrderMap.get(b.key)?.index ?? 999;
      return aOrder - bOrder;
    });

    localColumns.value.forEach(col => {
      const stored = keyOrderMap.get(col.key);
      if (stored && !col.required) {
        col.visible = stored.visible;
      }
    });
  } catch (e) {
    console.error('Failed to load column settings from storage:', e);
  }
}

function moveUp(index: number) {
  if (index > 0) {
    const item = localColumns.value.splice(index, 1)[0];
    if (item) {
      localColumns.value.splice(index - 1, 0, item);
      emitChange();
    }
  }
}

function moveDown(index: number) {
  if (index < localColumns.value.length - 1) {
    const item = localColumns.value.splice(index, 1)[0];
    if (item) {
      localColumns.value.splice(index + 1, 0, item);
      emitChange();
    }
  }
}

// Watch for prop changes
watch(
  () => props.columns,
  (newColumns) => {
    // Preserve order and visibility of existing columns
    const existingMap = new Map(
      localColumns.value.map((c, i) => [c.key, { index: i, visible: c.visible }])
    );

    const updated = newColumns.map(col => {
      const existing = existingMap.get(col.key);
      return {
        ...col,
        visible: existing?.visible ?? col.visible ?? true,
      };
    });

    // Sort by existing order if available
    updated.sort((a, b) => {
      const aIdx = existingMap.get(a.key)?.index ?? 999;
      const bIdx = existingMap.get(b.key)?.index ?? 999;
      return aIdx - bIdx;
    });

    localColumns.value = updated;
  },
  { deep: true }
);

// Initialize from storage on mount
loadFromStorage();

// Expose methods
defineExpose({
  openDrawer,
  closeDrawer,
  resetToDefault,
  getColumns: () => [...localColumns.value],
});
</script>

<template>
  <div class="column-settings">
    <!-- Trigger Button -->
    <Tooltip v-if="showButton" title="Column Settings">
      <Button @click="openDrawer">
        <template #icon><SettingOutlined /></template>
        {{ buttonText }}
      </Button>
    </Tooltip>

    <!-- Settings Drawer -->
    <Drawer
      v-model:open="drawerVisible"
      :title="title"
      :width="drawerWidth"
      placement="right"
      :destroy-on-close="false"
      @close="closeDrawer"
    >
      <!-- Header Actions -->
      <div class="column-settings__header">
        <div class="column-settings__info">
          <span class="text-sm text-gray-500">
            {{ visibleCount }} of {{ totalCount }} columns visible
          </span>
        </div>
        <Space>
          <Button size="small" @click="toggleAll">
            <template #icon>
              <EyeOutlined v-if="!allVisible" />
              <EyeInvisibleOutlined v-else />
            </template>
            {{ allVisible ? 'Hide All' : 'Show All' }}
          </Button>
          <Button size="small" @click="resetToDefault">
            <template #icon><ReloadOutlined /></template>
            Reset
          </Button>
        </Space>
      </div>

      <Divider class="my-3" />

      <!-- Column List -->
      <div class="column-settings__list">
        <div
          v-for="(column, index) in localColumns"
          :key="column.key"
          class="column-settings__item"
          :class="{
            'column-settings__item--hidden': !column.visible,
            'column-settings__item--required': column.required,
          }"
        >
          <!-- Grip Icon -->
          <div class="column-settings__grip">
            <MenuOutlined />
          </div>

          <!-- Column Info -->
          <div class="column-settings__item-content">
            <span class="column-settings__item-title">{{ column.title }}</span>
            <span v-if="column.fixed" class="column-settings__item-badge">
              Fixed {{ column.fixed }}
            </span>
            <span v-if="column.required" class="column-settings__item-badge column-settings__item-badge--required">
              Required
            </span>
          </div>

          <!-- Move Buttons -->
          <div class="column-settings__item-actions">
            <Tooltip title="Move up">
              <Button
                type="text"
                size="small"
                :disabled="index === 0"
                @click="moveUp(index)"
              >
                <template #icon><ArrowUpOutlined /></template>
              </Button>
            </Tooltip>
            <Tooltip title="Move down">
              <Button
                type="text"
                size="small"
                :disabled="index === localColumns.length - 1"
                @click="moveDown(index)"
              >
                <template #icon><ArrowDownOutlined /></template>
              </Button>
            </Tooltip>
          </div>

          <!-- Visibility Toggle -->
          <Switch
            :checked="column.visible"
            :disabled="column.required"
            size="small"
            @change="toggleVisibility(column)"
          />
        </div>
      </div>

      <!-- Footer -->
      <template #footer>
        <div class="flex justify-between">
          <Button @click="resetToDefault">Reset to Default</Button>
          <Button type="primary" @click="closeDrawer">Done</Button>
        </div>
      </template>
    </Drawer>
  </div>
</template>

<style scoped>
.column-settings__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.column-settings__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column-settings__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.column-settings__item:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.column-settings__item--hidden {
  opacity: 0.6;
  background: #fff;
}

.column-settings__item--required {
  border-left: 3px solid #1890ff;
}

.column-settings__grip {
  color: #9ca3af;
  display: flex;
  align-items: center;
  padding: 4px;
}

.column-settings__grip:hover {
  color: #6b7280;
}

.column-settings__item-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.column-settings__item-title {
  font-weight: 500;
  color: #374151;
}

.column-settings__item-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: #e5e7eb;
  color: #6b7280;
  border-radius: 4px;
}

.column-settings__item-badge--required {
  background: #dbeafe;
  color: #1d4ed8;
}

.column-settings__item-actions {
  display: flex;
  gap: 0;
}


/* Dark mode */
:root.dark .column-settings__item {
  background: #374151;
  border-color: #4b5563;
}

:root.dark .column-settings__item:hover {
  background: #4b5563;
}

:root.dark .column-settings__item--hidden {
  background: #1f2937;
}

:root.dark .column-settings__item-title {
  color: #f3f4f6;
}

:root.dark .column-settings__item-badge {
  background: #4b5563;
  color: #d1d5db;
}

:root.dark .column-settings__grip {
  color: #6b7280;
}

:root.dark .column-settings__grip:hover {
  color: #9ca3af;
}
</style>
