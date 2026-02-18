<script setup lang="ts">
import { LayoutGrid } from 'lucide-vue-next';

const props = defineProps<{
  editor: any;
}>();

const emit = defineEmits<{
  (e: 'insert'): void;
}>();

interface LayoutOption {
  label: string;
  columns: number[];  // widths as fractions of 12 (grid system)
}

const layouts: LayoutOption[] = [
  { label: '1 Column', columns: [12] },
  { label: '1/2 + 1/2', columns: [6, 6] },
  { label: '1/3 + 2/3', columns: [4, 8] },
  { label: '2/3 + 1/3', columns: [8, 4] },
  { label: '1/3 + 1/3 + 1/3', columns: [4, 4, 4] },
  { label: '1/4 + 3/4', columns: [3, 9] },
  { label: '3/4 + 1/4', columns: [9, 3] },
  { label: '1/4 + 1/2 + 1/4', columns: [3, 6, 3] },
  { label: '1/4 x 4', columns: [3, 3, 3, 3] },
  { label: '1/5 + 3/5 + 1/5', columns: [2, 8, 2] },
];

function colPercent(col: number): string {
  return `${(col / 12) * 100}%`;
}

function insertLayout(layout: LayoutOption) {
  if (!props.editor) return;

  // Build column content - each column gets a width percentage
  const totalCols = layout.columns.reduce((a, b) => a + b, 0);
  const columnNodes = layout.columns.map(col => ({
    type: 'columnBlock',
    attrs: { width: Math.round((col / totalCols) * 100) },
    content: [{ type: 'paragraph' }],
  }));

  // Insert a columnsBlock with the columns
  props.editor.chain().focus().insertContent({
    type: 'columnsBlock',
    content: columnNodes,
  }).run();

  emit('insert');
}
</script>

<template>
  <div class="layout-picker">
    <div class="layout-picker-header">
      <LayoutGrid :size="14" />
      <span>Choose a Layout</span>
    </div>
    <div class="layout-grid">
      <div
        v-for="(layout, idx) in layouts"
        :key="idx"
        class="layout-option"
        :title="layout.label"
        @click="insertLayout(layout)"
      >
        <div class="layout-preview">
          <div
            v-for="(col, cIdx) in layout.columns"
            :key="cIdx"
            class="layout-col"
            :style="{ width: colPercent(col) }"
          />
        </div>
        <div class="layout-label">{{ layout.label }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout-picker {
  padding: 8px;
}
.layout-picker-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 8px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.layout-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.layout-option {
  cursor: pointer;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
  background: #fff;
  transition: all 0.15s;
  text-align: center;
}
.layout-option:hover {
  border-color: #1677ff;
  background: #f0f5ff;
}
.layout-preview {
  display: flex;
  gap: 3px;
  height: 32px;
  margin-bottom: 6px;
}
.layout-col {
  background: #d1d5db;
  border-radius: 3px;
  min-width: 4px;
  transition: background 0.15s;
}
.layout-option:hover .layout-col {
  background: #93b4f5;
}
.layout-label {
  font-size: 10px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
