<script lang="ts" setup generic="T extends Record<string, any>">
import { computed } from 'vue';

import type { CardGridViewProps, ViewMode } from './types';

const props = withDefaults(defineProps<CardGridViewProps<T>>(), {
  items: () => [],
  loading: false,
  viewMode: 'card',
  gridCols: () => ({ xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 5 }),
  gap: 16,
  rowKey: 'id',
  showViewToggle: true,
  availableModes: () => ['card', 'list'],
  emptyText: 'No items found',
  cardMinWidth: 280,
  cardMaxWidth: 400,
});

const emit = defineEmits<{
  (e: 'update:viewMode', mode: ViewMode): void;
  (e: 'itemClick', item: T): void;
}>();

defineSlots<{
  card?: (props: { item: T; index: number }) => any;
  gridItem?: (props: { item: T; index: number }) => any;
  listItem?: (props: { item: T; index: number }) => any;
  empty?: () => any;
  header?: (props: { viewMode: ViewMode; toggleView: (mode: ViewMode) => void }) => any;
  actions?: (props: { item: T; index: number }) => any;
}>();

const getItemKey = (item: T, index: number): string | number => {
  if (typeof props.rowKey === 'function') {
    return props.rowKey(item);
  }
  return item[props.rowKey] ?? index;
};

const gridStyle = computed(() => {
  const cols = props.gridCols;
  if (typeof cols === 'number') {
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gap: `${props.gap}px`,
    };
  }
  return {
    display: 'grid',
    gap: `${props.gap}px`,
  };
});

const cardGridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(${props.cardMinWidth}px, 1fr))`,
  gap: `${props.gap}px`,
}));

const gridColsClass = computed(() => {
  const cols = props.gridCols;
  if (typeof cols === 'object') {
    const classes: string[] = [];
    if (cols.xs) classes.push(`grid-cols-${cols.xs}`);
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
    if (cols.xxl) classes.push(`2xl:grid-cols-${cols.xxl}`);
    return classes.join(' ');
  }
  return '';
});

function toggleView(mode: ViewMode) {
  emit('update:viewMode', mode);
}

function handleItemClick(item: T) {
  emit('itemClick', item);
}

const viewModeIcons: Record<ViewMode, string> = {
  card: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z',
  grid: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zM3 14h7v7H3v-7z',
  list: 'M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z',
};

const viewModeLabels: Record<ViewMode, string> = {
  card: 'Card View',
  grid: 'Grid View',
  list: 'List View',
};
</script>

<template>
  <div class="card-grid-view">
    <!-- Header with view toggle -->
    <div v-if="showViewToggle || $slots.header" class="card-grid-view__header mb-4">
      <slot name="header" :view-mode="viewMode" :toggle-view="toggleView">
        <div class="flex items-center justify-end gap-1">
          <button
            v-for="mode in availableModes"
            :key="mode"
            type="button"
            class="view-toggle-btn"
            :class="{ 'view-toggle-btn--active': viewMode === mode }"
            :title="viewModeLabels[mode]"
            @click="toggleView(mode)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="h-5 w-5"
            >
              <path :d="viewModeIcons[mode]" />
            </svg>
          </button>
        </div>
      </slot>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="card-grid-view__loading">
      <div class="flex items-center justify-center py-12">
        <div class="loading-spinner" />
        <span class="ml-2 text-gray-500">Loading...</span>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="items.length === 0" class="card-grid-view__empty">
      <slot name="empty">
        <div class="flex flex-col items-center justify-center py-12 text-gray-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="mb-4 h-16 w-16 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p>{{ emptyText }}</p>
        </div>
      </slot>
    </div>

    <!-- Card View -->
    <div
      v-else-if="viewMode === 'card'"
      class="card-grid-view__cards"
      :style="cardGridStyle"
    >
      <div
        v-for="(item, index) in items"
        :key="getItemKey(item, index)"
        class="card-grid-view__card"
        @click="handleItemClick(item)"
      >
        <slot name="card" :item="item" :index="index">
          <div class="default-card">
            <div class="default-card__content">
              {{ item }}
            </div>
          </div>
        </slot>
        <div v-if="$slots.actions" class="card-grid-view__actions">
          <slot name="actions" :item="item" :index="index" />
        </div>
      </div>
    </div>

    <!-- Grid View -->
    <div
      v-else-if="viewMode === 'grid'"
      class="card-grid-view__grid grid"
      :class="gridColsClass"
      :style="typeof gridCols === 'number' ? gridStyle : { gap: `${gap}px` }"
    >
      <div
        v-for="(item, index) in items"
        :key="getItemKey(item, index)"
        class="card-grid-view__grid-item"
        @click="handleItemClick(item)"
      >
        <slot name="gridItem" :item="item" :index="index">
          <slot name="card" :item="item" :index="index">
            <div class="default-card">
              <div class="default-card__content">
                {{ item }}
              </div>
            </div>
          </slot>
        </slot>
        <div v-if="$slots.actions" class="card-grid-view__actions">
          <slot name="actions" :item="item" :index="index" />
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else-if="viewMode === 'list'" class="card-grid-view__list">
      <div
        v-for="(item, index) in items"
        :key="getItemKey(item, index)"
        class="card-grid-view__list-item"
        @click="handleItemClick(item)"
      >
        <slot name="listItem" :item="item" :index="index">
          <slot name="card" :item="item" :index="index">
            <div class="default-list-item">
              {{ item }}
            </div>
          </slot>
        </slot>
        <div v-if="$slots.actions" class="card-grid-view__actions">
          <slot name="actions" :item="item" :index="index" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-grid-view {
  width: 100%;
}

.view-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid transparent;
  background-color: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.view-toggle-btn:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.view-toggle-btn--active {
  background-color: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.card-grid-view__card,
.card-grid-view__grid-item {
  position: relative;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card-grid-view__card:hover,
.card-grid-view__grid-item:hover {
  transform: translateY(-2px);
}

.card-grid-view__list-item {
  position: relative;
  padding: 1rem 0;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background-color 0.2s;
}

.card-grid-view__list-item:hover {
  background-color: #f9fafb;
}

.card-grid-view__list-item:last-child {
  border-bottom: none;
}

.default-card {
  background: white;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.default-list-item {
  padding: 0.75rem;
}

.card-grid-view__actions {
  margin-top: 0.5rem;
}

/* Dark mode support */
:root.dark .view-toggle-btn {
  color: #9ca3af;
}

:root.dark .view-toggle-btn:hover {
  background-color: #374151;
  color: #e5e7eb;
}

:root.dark .view-toggle-btn--active {
  background-color: #1e3a5f;
  color: #60a5fa;
  border-color: #1e40af;
}

:root.dark .card-grid-view__list-item {
  border-color: #374151;
}

:root.dark .card-grid-view__list-item:hover {
  background-color: #1f2937;
}

:root.dark .default-card {
  background: #1f2937;
  border-color: #374151;
}
</style>
