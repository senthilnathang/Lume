<script lang="ts" setup generic="T extends Record<string, any>">
import type { CSSProperties } from 'vue';
import { computed, ref, onMounted } from 'vue';
import type {
  GanttTask,
  GanttColumn,
  GanttViewMode,
  GanttTaskMoveEvent,
  GanttTaskResizeEvent,
  GanttTaskClickEvent,
  GanttDateRange,
} from './types';

interface Props {
  tasks: GanttTask<T>[];
  columns?: GanttColumn[];
  viewMode?: GanttViewMode;
  startDate?: Date | string;
  endDate?: Date | string;
  rowHeight?: number;
  headerHeight?: number;
  sidebarWidth?: number;
  showProgress?: boolean;
  showDependencies?: boolean;
  showToday?: boolean;
  allowDrag?: boolean;
  allowResize?: boolean;
  loading?: boolean;
  locale?: string;
}

const props = withDefaults(defineProps<Props>(), {
  columns: () => [
    { field: 'title', title: 'Task', width: 200 },
  ],
  viewMode: 'month',
  rowHeight: 40,
  headerHeight: 50,
  sidebarWidth: 300,
  showProgress: true,
  showDependencies: true,
  showToday: true,
  allowDrag: true,
  allowResize: true,
  loading: false,
  locale: 'en',
});

const emit = defineEmits<{
  (e: 'task-click', payload: GanttTaskClickEvent): void;
  (e: 'task-dblclick', payload: GanttTaskClickEvent): void;
  (e: 'task-move', payload: GanttTaskMoveEvent): void;
  (e: 'task-resize', payload: GanttTaskResizeEvent): void;
  (e: 'view-change', viewMode: GanttViewMode): void;
  (e: 'date-range-change', range: GanttDateRange): void;
}>();

defineSlots<{
  'task-content'?: (props: { task: GanttTask<T> }) => any;
  'task-tooltip'?: (props: { task: GanttTask<T> }) => any;
  'sidebar-header'?: () => any;
  'sidebar-row'?: (props: { task: GanttTask<T>; columns: GanttColumn[] }) => any;
  'header-cell'?: (props: { date: Date; viewMode: GanttViewMode }) => any;
  'toolbar-left'?: () => any;
  'toolbar-right'?: () => any;
  empty?: () => any;
}>();

// State
const containerRef = ref<HTMLElement | null>(null);
const hoveredTask = ref<string | number | null>(null);
const dragState = ref<{
  taskId: string | number;
  type: 'move' | 'resize';
  startX: number;
  startDate: Date;
  endDate: Date;
} | null>(null);

// Computed date range
const dateRange = computed<GanttDateRange>(() => {
  if (props.startDate && props.endDate) {
    return {
      start: new Date(props.startDate),
      end: new Date(props.endDate),
    };
  }

  if (props.tasks.length === 0) {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 3, 0),
    };
  }

  let minDate = new Date();
  let maxDate = new Date();

  props.tasks.forEach((task) => {
    const start = new Date(task.start);
    const end = new Date(task.end);
    if (start < minDate) minDate = start;
    if (end > maxDate) maxDate = end;
  });

  // Add padding
  minDate.setDate(minDate.getDate() - 7);
  maxDate.setDate(maxDate.getDate() + 7);

  return { start: minDate, end: maxDate };
});

// View mode configuration
const viewConfig = computed(() => {
  const configs = {
    day: { cellWidth: 40, format: 'dd', headerFormat: 'MMM dd' },
    week: { cellWidth: 100, format: 'W', headerFormat: 'MMM dd' },
    month: { cellWidth: 120, format: 'MMM', headerFormat: 'yyyy' },
    quarter: { cellWidth: 200, format: 'Q', headerFormat: 'yyyy' },
    year: { cellWidth: 300, format: 'yyyy', headerFormat: '' },
  };
  return configs[props.viewMode];
});

// Generate time cells
const timeCells = computed(() => {
  const cells: Array<{ date: Date; label: string; isToday: boolean }> = [];
  const { start, end } = dateRange.value;
  const current = new Date(start);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  while (current <= end) {
    const cellDate = new Date(current);
    const isToday = cellDate.getTime() === today.getTime();

    let label = '';
    switch (props.viewMode) {
      case 'day':
        label = current.getDate().toString();
        break;
      case 'week':
        label = `W${getWeekNumber(current)}`;
        break;
      case 'month':
        label = current.toLocaleDateString(props.locale, { month: 'short' });
        break;
      case 'quarter':
        label = `Q${Math.floor(current.getMonth() / 3) + 1}`;
        break;
      case 'year':
        label = current.getFullYear().toString();
        break;
    }

    cells.push({ date: cellDate, label, isToday });

    // Increment based on view mode
    switch (props.viewMode) {
      case 'day':
        current.setDate(current.getDate() + 1);
        break;
      case 'week':
        current.setDate(current.getDate() + 7);
        break;
      case 'month':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'quarter':
        current.setMonth(current.getMonth() + 3);
        break;
      case 'year':
        current.setFullYear(current.getFullYear() + 1);
        break;
    }
  }

  return cells;
});

// Timeline width
const timelineWidth = computed(() => {
  return timeCells.value.length * viewConfig.value.cellWidth;
});

// Calculate task position and width
function getTaskStyle(task: GanttTask): CSSProperties {
  const { start: rangeStart } = dateRange.value;
  const taskStart = new Date(task.start);
  const taskEnd = new Date(task.end);

  const totalDays = getDaysDiff(dateRange.value.start, dateRange.value.end);
  const startOffset = getDaysDiff(rangeStart, taskStart);
  const duration = getDaysDiff(taskStart, taskEnd) || 1;

  const left = (startOffset / totalDays) * timelineWidth.value;
  const width = (duration / totalDays) * timelineWidth.value;

  return {
    left: `${Math.max(0, left)}px`,
    width: `${Math.max(20, width)}px`,
    backgroundColor: task.color || getTaskColor(task),
  };
}

function getTaskColor(task: GanttTask): string {
  if (task.type === 'milestone') return '#f5222d';
  if (task.type === 'project') return '#722ed1';
  if (task.progress === 100) return '#52c41a';
  if (task.progress && task.progress > 0) return '#1890ff';
  return '#1890ff';
}

function getDaysDiff(start: Date, end: Date): number {
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Today marker position
const todayPosition = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { start } = dateRange.value;
  const totalDays = getDaysDiff(dateRange.value.start, dateRange.value.end);
  const daysFromStart = getDaysDiff(start, today);
  return (daysFromStart / totalDays) * timelineWidth.value;
});

// Event handlers
function handleTaskClick(task: GanttTask, event: MouseEvent) {
  emit('task-click', { task, event });
}

function handleTaskDblClick(task: GanttTask, event: MouseEvent) {
  emit('task-dblclick', { task, event });
}

function handleMouseDown(task: GanttTask, event: MouseEvent, type: 'move' | 'resize') {
  if (!props.allowDrag && type === 'move') return;
  if (!props.allowResize && type === 'resize') return;

  dragState.value = {
    taskId: task.id,
    type,
    startX: event.clientX,
    startDate: new Date(task.start),
    endDate: new Date(task.end),
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

function handleMouseMove(event: MouseEvent) {
  if (!dragState.value) return;

  const task = props.tasks.find((t) => t.id === dragState.value?.taskId);
  if (!task) return;

  const deltaX = event.clientX - dragState.value.startX;
  const totalDays = getDaysDiff(dateRange.value.start, dateRange.value.end);
  const deltaDays = Math.round((deltaX / timelineWidth.value) * totalDays);

  if (dragState.value.type === 'move') {
    // Move task
    const newStart = new Date(dragState.value.startDate);
    const newEnd = new Date(dragState.value.endDate);
    newStart.setDate(newStart.getDate() + deltaDays);
    newEnd.setDate(newEnd.getDate() + deltaDays);

    // Update task temporarily (should emit event for parent to update)
    task.start = newStart;
    task.end = newEnd;
  } else if (dragState.value.type === 'resize') {
    // Resize task
    const newEnd = new Date(dragState.value.endDate);
    newEnd.setDate(newEnd.getDate() + deltaDays);

    if (newEnd > new Date(task.start)) {
      task.end = newEnd;
    }
  }
}

function handleMouseUp() {
  if (!dragState.value) return;

  const task = props.tasks.find((t) => t.id === dragState.value?.taskId);
  if (task) {
    if (dragState.value.type === 'move') {
      emit('task-move', {
        task,
        oldStart: dragState.value.startDate,
        oldEnd: dragState.value.endDate,
        newStart: new Date(task.start),
        newEnd: new Date(task.end),
      });
    } else {
      emit('task-resize', {
        task,
        oldEnd: dragState.value.endDate,
        newEnd: new Date(task.end),
      });
    }
  }

  dragState.value = null;
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
}

function scrollToToday() {
  if (containerRef.value) {
    const scrollContainer = containerRef.value.querySelector('.gantt-timeline-scroll');
    if (scrollContainer) {
      scrollContainer.scrollLeft = todayPosition.value - 200;
    }
  }
}

function changeViewMode(mode: GanttViewMode) {
  emit('view-change', mode);
}

// Expose methods
defineExpose({
  scrollToToday,
  changeViewMode,
});

onMounted(() => {
  if (props.showToday) {
    scrollToToday();
  }
});
</script>

<template>
  <div ref="containerRef" class="gantt-chart" :class="{ 'gantt-chart--loading': loading }">
    <!-- Loading overlay -->
    <div v-if="loading" class="gantt-loading">
      <div class="gantt-loading-spinner"></div>
    </div>

    <!-- Toolbar -->
    <div class="gantt-toolbar">
      <div class="gantt-toolbar-left">
        <slot name="toolbar-left"></slot>
      </div>
      <div class="gantt-toolbar-center">
        <div class="gantt-view-modes">
          <button
            v-for="mode in (['day', 'week', 'month', 'quarter', 'year'] as GanttViewMode[])"
            :key="mode"
            class="gantt-view-mode-btn"
            :class="{ 'gantt-view-mode-btn--active': viewMode === mode }"
            @click="changeViewMode(mode)"
          >
            {{ mode.charAt(0).toUpperCase() + mode.slice(1) }}
          </button>
        </div>
      </div>
      <div class="gantt-toolbar-right">
        <button v-if="showToday" class="gantt-today-btn" @click="scrollToToday">
          Today
        </button>
        <slot name="toolbar-right"></slot>
      </div>
    </div>

    <div class="gantt-container">
      <!-- Sidebar -->
      <div class="gantt-sidebar" :style="{ width: `${sidebarWidth}px` }">
        <!-- Sidebar Header -->
        <div class="gantt-sidebar-header" :style="{ height: `${headerHeight}px` }">
          <slot name="sidebar-header">
            <div
              v-for="column in columns"
              :key="column.field"
              class="gantt-sidebar-header-cell"
              :style="{ width: column.width ? `${column.width}px` : 'auto' }"
            >
              {{ column.title }}
            </div>
          </slot>
        </div>

        <!-- Sidebar Rows -->
        <div class="gantt-sidebar-body">
          <div
            v-for="task in tasks"
            :key="task.id"
            class="gantt-sidebar-row"
            :style="{ height: `${rowHeight}px` }"
            :class="{ 'gantt-sidebar-row--hovered': hoveredTask === task.id }"
            @mouseenter="hoveredTask = task.id"
            @mouseleave="hoveredTask = null"
          >
            <slot name="sidebar-row" :task="task" :columns="columns">
              <div
                v-for="column in columns"
                :key="column.field"
                class="gantt-sidebar-cell"
                :style="{
                  width: column.width ? `${column.width}px` : 'auto',
                  textAlign: column.align || 'left',
                }"
              >
                <template v-if="column.formatter">
                  {{ column.formatter(task) }}
                </template>
                <template v-else>
                  {{ task[column.field] }}
                </template>
              </div>
            </slot>
          </div>

          <div v-if="tasks.length === 0" class="gantt-empty">
            <slot name="empty">
              <span>No tasks to display</span>
            </slot>
          </div>
        </div>
      </div>

      <!-- Timeline -->
      <div class="gantt-timeline">
        <!-- Timeline Header -->
        <div class="gantt-timeline-header" :style="{ height: `${headerHeight}px` }">
          <div class="gantt-timeline-header-scroll" :style="{ width: `${timelineWidth}px` }">
            <div
              v-for="(cell, index) in timeCells"
              :key="index"
              class="gantt-timeline-header-cell"
              :class="{ 'gantt-timeline-header-cell--today': cell.isToday }"
              :style="{ width: `${viewConfig.cellWidth}px` }"
            >
              <slot name="header-cell" :date="cell.date" :view-mode="viewMode">
                {{ cell.label }}
              </slot>
            </div>
          </div>
        </div>

        <!-- Timeline Body -->
        <div class="gantt-timeline-scroll">
          <div
            class="gantt-timeline-body"
            :style="{ width: `${timelineWidth}px` }"
          >
            <!-- Grid lines -->
            <div class="gantt-grid">
              <div
                v-for="(cell, index) in timeCells"
                :key="index"
                class="gantt-grid-cell"
                :class="{
                  'gantt-grid-cell--today': cell.isToday,
                  'gantt-grid-cell--weekend': cell.date.getDay() === 0 || cell.date.getDay() === 6,
                }"
                :style="{ width: `${viewConfig.cellWidth}px` }"
              ></div>
            </div>

            <!-- Today marker -->
            <div
              v-if="showToday"
              class="gantt-today-marker"
              :style="{ left: `${todayPosition}px` }"
            ></div>

            <!-- Task rows -->
            <div
              v-for="task in tasks"
              :key="task.id"
              class="gantt-task-row"
              :style="{ height: `${rowHeight}px` }"
              :class="{ 'gantt-task-row--hovered': hoveredTask === task.id }"
              @mouseenter="hoveredTask = task.id"
              @mouseleave="hoveredTask = null"
            >
              <!-- Task bar -->
              <div
                class="gantt-task-bar"
                :class="{
                  'gantt-task-bar--milestone': task.type === 'milestone',
                  'gantt-task-bar--project': task.type === 'project',
                  'gantt-task-bar--dragging': dragState?.taskId === task.id,
                }"
                :style="getTaskStyle(task)"
                @click="handleTaskClick(task, $event)"
                @dblclick="handleTaskDblClick(task, $event)"
                @mousedown="handleMouseDown(task, $event, 'move')"
              >
                <!-- Progress bar -->
                <div
                  v-if="showProgress && task.progress !== undefined && task.type !== 'milestone'"
                  class="gantt-task-progress"
                  :style="{ width: `${task.progress}%` }"
                ></div>

                <!-- Task content -->
                <div class="gantt-task-content">
                  <slot name="task-content" :task="task">
                    <span class="gantt-task-title">{{ task.title }}</span>
                  </slot>
                </div>

                <!-- Resize handle -->
                <div
                  v-if="allowResize && task.type !== 'milestone'"
                  class="gantt-task-resize-handle"
                  @mousedown.stop="handleMouseDown(task, $event, 'resize')"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gantt-chart {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
}

.gantt-chart--loading {
  pointer-events: none;
}

.gantt-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 100;
}

.gantt-loading-spinner {
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

/* Toolbar */
.gantt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e8e8e8;
  background-color: #fafafa;
}

.gantt-toolbar-left,
.gantt-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gantt-view-modes {
  display: flex;
  gap: 4px;
  background-color: #f0f0f0;
  padding: 4px;
  border-radius: 6px;
}

.gantt-view-mode-btn {
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.gantt-view-mode-btn:hover {
  color: #333;
}

.gantt-view-mode-btn--active {
  background-color: #fff;
  color: #1890ff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.gantt-today-btn {
  padding: 6px 12px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 4px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  transition: all 0.2s;
}

.gantt-today-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

/* Container */
.gantt-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar */
.gantt-sidebar {
  flex-shrink: 0;
  border-right: 1px solid #e8e8e8;
  background-color: #fff;
  overflow: hidden;
}

.gantt-sidebar-header {
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid #e8e8e8;
  background-color: #fafafa;
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.gantt-sidebar-header-cell {
  flex: 1;
  padding: 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gantt-sidebar-body {
  overflow-y: auto;
}

.gantt-sidebar-row {
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.15s;
}

.gantt-sidebar-row--hovered {
  background-color: #f5f5f5;
}

.gantt-sidebar-cell {
  flex: 1;
  padding: 0 8px;
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Timeline */
.gantt-timeline {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.gantt-timeline-header {
  flex-shrink: 0;
  overflow: hidden;
  border-bottom: 1px solid #e8e8e8;
  background-color: #fafafa;
}

.gantt-timeline-header-scroll {
  display: flex;
}

.gantt-timeline-header-cell {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #666;
  border-right: 1px solid #f0f0f0;
}

.gantt-timeline-header-cell--today {
  background-color: #e6f7ff;
  color: #1890ff;
  font-weight: 600;
}

.gantt-timeline-scroll {
  flex: 1;
  overflow: auto;
}

.gantt-timeline-body {
  position: relative;
  min-height: 100%;
}

/* Grid */
.gantt-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  pointer-events: none;
}

.gantt-grid-cell {
  flex-shrink: 0;
  height: 100%;
  border-right: 1px solid #f0f0f0;
}

.gantt-grid-cell--today {
  background-color: rgba(24, 144, 255, 0.05);
}

.gantt-grid-cell--weekend {
  background-color: rgba(0, 0, 0, 0.02);
}

/* Today marker */
.gantt-today-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: #f5222d;
  z-index: 10;
}

.gantt-today-marker::before {
  content: '';
  position: absolute;
  top: 0;
  left: -4px;
  width: 10px;
  height: 10px;
  background-color: #f5222d;
  border-radius: 50%;
}

/* Task rows */
.gantt-task-row {
  position: relative;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.15s;
}

.gantt-task-row--hovered {
  background-color: #f5f5f5;
}

/* Task bar */
.gantt-task-bar {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  transition: box-shadow 0.2s, opacity 0.2s;
  overflow: hidden;
}

.gantt-task-bar:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.gantt-task-bar--dragging {
  opacity: 0.8;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.gantt-task-bar--milestone {
  width: 20px !important;
  height: 20px;
  border-radius: 2px;
  transform: translateY(-50%) rotate(45deg);
}

.gantt-task-bar--project {
  height: 8px;
  border-radius: 2px;
}

/* Progress */
.gantt-task-progress {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px 0 0 4px;
}

/* Task content */
.gantt-task-content {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 8px;
  z-index: 1;
}

.gantt-task-title {
  font-size: 12px;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* Resize handle */
.gantt-task-resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  height: 100%;
  cursor: ew-resize;
  z-index: 2;
}

.gantt-task-resize-handle:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

/* Empty state */
.gantt-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #999;
  font-size: 14px;
}

/* Dark mode */
.dark .gantt-chart {
  background-color: #1f1f1f;
  border-color: #333;
}

.dark .gantt-toolbar {
  background-color: #2d2d2d;
  border-bottom-color: #333;
}

.dark .gantt-view-modes {
  background-color: #1f1f1f;
}

.dark .gantt-view-mode-btn {
  color: #ccc;
}

.dark .gantt-view-mode-btn--active {
  background-color: #333;
  color: #1890ff;
}

.dark .gantt-today-btn {
  background-color: #333;
  border-color: #444;
  color: #ccc;
}

.dark .gantt-sidebar {
  background-color: #1f1f1f;
  border-right-color: #333;
}

.dark .gantt-sidebar-header {
  background-color: #2d2d2d;
  border-bottom-color: #333;
  color: #fff;
}

.dark .gantt-sidebar-row {
  border-bottom-color: #333;
}

.dark .gantt-sidebar-row--hovered {
  background-color: #2d2d2d;
}

.dark .gantt-sidebar-cell {
  color: #ccc;
}

.dark .gantt-timeline-header {
  background-color: #2d2d2d;
  border-bottom-color: #333;
}

.dark .gantt-timeline-header-cell {
  border-right-color: #333;
  color: #ccc;
}

.dark .gantt-grid-cell {
  border-right-color: #333;
}

.dark .gantt-task-row {
  border-bottom-color: #333;
}

.dark .gantt-task-row--hovered {
  background-color: #2d2d2d;
}
</style>
