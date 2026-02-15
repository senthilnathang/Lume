<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { Settings, Menu, Eye, EyeOff } from 'lucide-vue-next';

/**
 * ColumnSettings - Drawer for managing table column visibility and order.
 *
 * Provides checkboxes to toggle column visibility and HTML5 drag-drop
 * reordering. Persists settings to localStorage under the given storageKey.
 */

defineOptions({ name: 'ColumnSettings' });

interface Column {
  key: string;
  title: string;
}

interface ColumnConfig {
  key: string;
  title: string;
  visible: boolean;
}

const props = defineProps<{
  visible: boolean;
  columns: Column[];
  storageKey: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:columns', columns: ColumnConfig[]): void;
}>();

// --- Internal State ---

const localColumns = ref<ColumnConfig[]>([]);
const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

// --- Helpers ---

function buildDefaultConfig(): ColumnConfig[] {
  return props.columns.map(col => ({
    key: col.key,
    title: col.title,
    visible: true,
  }));
}

function loadFromStorage(): ColumnConfig[] | null {
  try {
    const raw = localStorage.getItem(props.storageKey);
    if (!raw) return null;
    const saved: ColumnConfig[] = JSON.parse(raw);
    if (!Array.isArray(saved) || saved.length === 0) return null;

    // Merge saved settings with current columns (handles added/removed columns)
    const savedMap = new Map(saved.map(c => [c.key, c]));
    const merged: ColumnConfig[] = [];

    // First, add saved columns that still exist (preserves order)
    for (const s of saved) {
      const original = props.columns.find(c => c.key === s.key);
      if (original) {
        merged.push({
          key: s.key,
          title: original.title,
          visible: s.visible,
        });
      }
    }

    // Then, add any new columns not in saved settings
    for (const col of props.columns) {
      if (!savedMap.has(col.key)) {
        merged.push({ key: col.key, title: col.title, visible: true });
      }
    }

    return merged;
  } catch {
    return null;
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(props.storageKey, JSON.stringify(localColumns.value));
  } catch {
    // localStorage unavailable
  }
}

function initColumns() {
  const saved = loadFromStorage();
  localColumns.value = saved ?? buildDefaultConfig();
}

// --- Visibility ---

function toggleVisibility(index: number) {
  localColumns.value[index].visible = !localColumns.value[index].visible;
}

const allVisible = computed(() => localColumns.value.every(c => c.visible));
const noneVisible = computed(() => localColumns.value.every(c => !c.visible));

function toggleAll() {
  const newValue = !allVisible.value;
  localColumns.value.forEach(c => (c.visible = newValue));
}

// --- Drag and Drop ---

function onDragStart(index: number, event: DragEvent) {
  dragIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }
}

function onDragOver(index: number, event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  dragOverIndex.value = index;
}

function onDragLeave() {
  dragOverIndex.value = null;
}

function onDrop(index: number, event: DragEvent) {
  event.preventDefault();
  if (dragIndex.value === null || dragIndex.value === index) {
    dragIndex.value = null;
    dragOverIndex.value = null;
    return;
  }

  const items = [...localColumns.value];
  const [moved] = items.splice(dragIndex.value, 1);
  items.splice(index, 0, moved);
  localColumns.value = items;

  dragIndex.value = null;
  dragOverIndex.value = null;
}

function onDragEnd() {
  dragIndex.value = null;
  dragOverIndex.value = null;
}

// --- Actions ---

function handleApply() {
  saveToStorage();
  emit('update:columns', [...localColumns.value]);
  emit('close');
}

function handleReset() {
  try {
    localStorage.removeItem(props.storageKey);
  } catch {
    // localStorage unavailable
  }
  localColumns.value = buildDefaultConfig();
}

function handleClose() {
  emit('close');
}

// --- Lifecycle ---

onMounted(() => {
  initColumns();
});

// Re-init when drawer opens (in case columns prop changed)
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      initColumns();
    }
  }
);
</script>

<template>
  <a-drawer
    :open="visible"
    title="Column Settings"
    placement="right"
    :width="380"
    :closable="true"
    @close="handleClose"
  >
    <template #extra>
      <Settings :size="18" class="text-gray-400" />
    </template>

    <div class="flex flex-col h-full">
      <!-- Toggle All -->
      <div class="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
        <span class="text-sm font-medium text-gray-600">Toggle All</span>
        <a-checkbox
          :checked="allVisible"
          :indeterminate="!allVisible && !noneVisible"
          @change="toggleAll"
        />
      </div>

      <!-- Column List -->
      <div class="flex-1 overflow-y-auto -mx-1">
        <div
          v-for="(col, index) in localColumns"
          :key="col.key"
          draggable="true"
          class="flex items-center gap-2 px-3 py-2 mx-1 mb-1 rounded-md cursor-move transition-colors select-none"
          :class="{
            'bg-blue-50 border border-blue-200': dragOverIndex === index,
            'opacity-50': dragIndex === index,
            'bg-gray-50 hover:bg-gray-100': dragOverIndex !== index && dragIndex !== index,
          }"
          @dragstart="onDragStart(index, $event)"
          @dragover="onDragOver(index, $event)"
          @dragleave="onDragLeave"
          @drop="onDrop(index, $event)"
          @dragend="onDragEnd"
        >
          <!-- Drag Handle -->
          <Menu :size="16" class="text-gray-400 flex-shrink-0" />

          <!-- Visibility Icon -->
          <button
            class="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 transition-colors"
            @click.stop="toggleVisibility(index)"
          >
            <Eye v-if="col.visible" :size="16" class="text-blue-500" />
            <EyeOff v-else :size="16" class="text-gray-400" />
          </button>

          <!-- Column Title -->
          <span
            class="flex-1 text-sm truncate"
            :class="col.visible ? 'text-gray-800' : 'text-gray-400 line-through'"
          >
            {{ col.title }}
          </span>

          <!-- Checkbox -->
          <a-checkbox
            :checked="col.visible"
            @change="toggleVisibility(index)"
          />
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
        <a-button @click="handleReset">
          Reset to Default
        </a-button>
        <a-button type="primary" @click="handleApply">
          Apply
        </a-button>
      </div>
    </div>
  </a-drawer>
</template>
