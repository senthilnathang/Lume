<script lang="ts" setup>
import type { CSSProperties } from 'vue';

import { computed, ref } from 'vue';

export interface KanbanColumn<T = any> {
  id: string | number;
  title: string;
  color?: string;
  items: T[];
  limit?: number;
}

export interface KanbanItem {
  id: string | number;
  [key: string]: any;
}

interface Props {
  columns: KanbanColumn[];
  columnWidth?: number | string;
  minColumnWidth?: number | string;
  maxColumnWidth?: number | string;
  columnGap?: number;
  loading?: boolean;
  allowDrag?: boolean;
  showCount?: boolean;
  showColumnHeader?: boolean;
  emptyText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  columnWidth: 300,
  minColumnWidth: 280,
  maxColumnWidth: 400,
  columnGap: 16,
  loading: false,
  allowDrag: true,
  showCount: true,
  showColumnHeader: true,
  emptyText: 'No items',
});

const emit = defineEmits<{
  (e: 'item-move', payload: { item: any; fromColumn: string | number; toColumn: string | number; toIndex: number }): void;
  (e: 'item-click', payload: { item: any; column: KanbanColumn }): void;
  (e: 'column-click', column: KanbanColumn): void;
}>();

defineSlots<{
  item?: (props: { item: any; column: KanbanColumn; index: number }) => any;
  'column-header'?: (props: { column: KanbanColumn }) => any;
  'column-footer'?: (props: { column: KanbanColumn }) => any;
  empty?: (props: { column: KanbanColumn }) => any;
}>();

const draggedItem = ref<any>(null);
const draggedFromColumn = ref<string | number | null>(null);
const dragOverColumn = ref<string | number | null>(null);
const dragOverIndex = ref<number>(-1);

const columnStyle = computed<CSSProperties>(() => ({
  width: typeof props.columnWidth === 'number' ? `${props.columnWidth}px` : props.columnWidth,
  minWidth: typeof props.minColumnWidth === 'number' ? `${props.minColumnWidth}px` : props.minColumnWidth,
  maxWidth: typeof props.maxColumnWidth === 'number' ? `${props.maxColumnWidth}px` : props.maxColumnWidth,
  marginRight: `${props.columnGap}px`,
}));

function getColumnColor(column: KanbanColumn): string {
  return column.color || '#1890ff';
}

function handleDragStart(event: DragEvent, item: any, columnId: string | number) {
  if (!props.allowDrag) return;

  draggedItem.value = item;
  draggedFromColumn.value = columnId;

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify({ itemId: item.id, columnId }));
  }
}

function handleDragOver(event: DragEvent, columnId: string | number, index: number) {
  if (!props.allowDrag || !draggedItem.value) return;

  event.preventDefault();
  dragOverColumn.value = columnId;
  dragOverIndex.value = index;

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function handleDragEnter(columnId: string | number) {
  if (!props.allowDrag || !draggedItem.value) return;
  dragOverColumn.value = columnId;
}

function handleDragLeave(event: DragEvent) {
  const target = event.relatedTarget as HTMLElement;
  if (!target || !target.closest('.kanban-column')) {
    dragOverColumn.value = null;
    dragOverIndex.value = -1;
  }
}

function handleDrop(event: DragEvent, columnId: string | number, index: number) {
  event.preventDefault();

  if (!props.allowDrag || !draggedItem.value || draggedFromColumn.value === null) {
    resetDragState();
    return;
  }

  emit('item-move', {
    item: draggedItem.value,
    fromColumn: draggedFromColumn.value,
    toColumn: columnId,
    toIndex: index,
  });

  resetDragState();
}

function handleDragEnd() {
  resetDragState();
}

function resetDragState() {
  draggedItem.value = null;
  draggedFromColumn.value = null;
  dragOverColumn.value = null;
  dragOverIndex.value = -1;
}

function handleItemClick(item: any, column: KanbanColumn) {
  emit('item-click', { item, column });
}

function handleColumnClick(column: KanbanColumn) {
  emit('column-click', column);
}

function isDropTarget(columnId: string | number, index: number): boolean {
  return dragOverColumn.value === columnId && dragOverIndex.value === index;
}
</script>

<template>
  <div class="kanban-board">
    <div v-if="loading" class="kanban-loading">
      <div class="kanban-loading-spinner"></div>
    </div>

    <div class="kanban-columns">
      <div
        v-for="column in columns"
        :key="column.id"
        class="kanban-column"
        :class="{
          'kanban-column--drag-over': dragOverColumn === column.id,
        }"
        :style="columnStyle"
        @dragenter="handleDragEnter(column.id)"
        @dragleave="handleDragLeave"
        @dragover="(e) => handleDragOver(e, column.id, column.items.length)"
        @drop="(e) => handleDrop(e, column.id, column.items.length)"
      >
        <!-- Column Header -->
        <div
          v-if="showColumnHeader"
          class="kanban-column-header"
          @click="handleColumnClick(column)"
        >
          <slot name="column-header" :column="column">
            <div class="kanban-column-header-content">
              <div
                class="kanban-column-indicator"
                :style="{ backgroundColor: getColumnColor(column) }"
              ></div>
              <span class="kanban-column-title">{{ column.title }}</span>
              <span v-if="showCount" class="kanban-column-count">
                {{ column.items.length }}
                <template v-if="column.limit">/ {{ column.limit }}</template>
              </span>
            </div>
          </slot>
        </div>

        <!-- Column Content -->
        <div class="kanban-column-content">
          <template v-if="column.items.length > 0">
            <div
              v-for="(item, index) in column.items"
              :key="item.id"
              class="kanban-item-wrapper"
              :class="{
                'kanban-item-wrapper--drop-target': isDropTarget(column.id, index),
              }"
              @dragover="(e) => handleDragOver(e, column.id, index)"
              @drop="(e) => handleDrop(e, column.id, index)"
            >
              <div
                class="kanban-item"
                :class="{
                  'kanban-item--dragging': draggedItem?.id === item.id,
                  'kanban-item--draggable': allowDrag,
                }"
                :draggable="allowDrag"
                @dragstart="(e) => handleDragStart(e, item, column.id)"
                @dragend="handleDragEnd"
                @click="handleItemClick(item, column)"
              >
                <slot name="item" :item="item" :column="column" :index="index">
                  <div class="kanban-item-default">
                    {{ item.title || item.name || item.id }}
                  </div>
                </slot>
              </div>
            </div>
          </template>

          <div v-else class="kanban-empty">
            <slot name="empty" :column="column">
              <span class="kanban-empty-text">{{ emptyText }}</span>
            </slot>
          </div>
        </div>

        <!-- Column Footer -->
        <div v-if="$slots['column-footer']" class="kanban-column-footer">
          <slot name="column-footer" :column="column"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kanban-board {
  position: relative;
  overflow-x: auto;
  padding: 16px;
}

.kanban-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 10;
}

.kanban-loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.kanban-columns {
  display: flex;
  align-items: flex-start;
}

.kanban-column {
  flex-shrink: 0;
  background-color: #f5f5f5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px);
  transition: background-color 0.2s;
}

.kanban-column:last-child {
  margin-right: 0 !important;
}

.kanban-column--drag-over {
  background-color: #e6f7ff;
}

.kanban-column-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e8e8e8;
  cursor: pointer;
}

.kanban-column-header-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kanban-column-indicator {
  width: 4px;
  height: 16px;
  border-radius: 2px;
}

.kanban-column-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  flex: 1;
}

.kanban-column-count {
  font-size: 12px;
  color: #666;
  background-color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
}

.kanban-column-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  min-height: 100px;
}

.kanban-item-wrapper {
  position: relative;
  margin-bottom: 8px;
}

.kanban-item-wrapper--drop-target::before {
  content: '';
  position: absolute;
  top: -4px;
  left: 0;
  right: 0;
  height: 3px;
  background-color: #1890ff;
  border-radius: 2px;
}

.kanban-item {
  background-color: #fff;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s, transform 0.2s, opacity 0.2s;
}

.kanban-item--draggable {
  cursor: grab;
}

.kanban-item--draggable:active {
  cursor: grabbing;
}

.kanban-item--dragging {
  opacity: 0.5;
  transform: scale(1.02);
}

.kanban-item:hover {
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
}

.kanban-item-default {
  font-size: 14px;
  color: #333;
}

.kanban-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  color: #999;
}

.kanban-empty-text {
  font-size: 13px;
}

.kanban-column-footer {
  padding: 8px 16px;
  border-top: 1px solid #e8e8e8;
}

/* Dark mode support */
.dark .kanban-column {
  background-color: #1f1f1f;
}

.dark .kanban-column--drag-over {
  background-color: #111d2c;
}

.dark .kanban-column-header {
  border-bottom-color: #333;
}

.dark .kanban-column-title {
  color: #fff;
}

.dark .kanban-column-count {
  background-color: #333;
  color: #ccc;
}

.dark .kanban-item {
  background-color: #2d2d2d;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.dark .kanban-item-default {
  color: #fff;
}

.dark .kanban-column-footer {
  border-top-color: #333;
}
</style>
