<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Clock } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const title = computed(() => props.node.attrs.title || 'Business Hours');
const closedLabel = computed(() => props.node.attrs.closedLabel || 'Closed');
const highlightToday = computed(() => props.node.attrs.highlightToday !== false);

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const todayIndex = computed(() => {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1; // Convert Sunday=0 to index 6
});

const days = computed(() => {
  const raw = props.node.attrs.days;
  if (Array.isArray(raw) && raw.length > 0) return raw;
  return [
    { day: 'Monday', hours: '9:00 AM - 5:00 PM', closed: false },
    { day: 'Tuesday', hours: '9:00 AM - 5:00 PM', closed: false },
    { day: 'Wednesday', hours: '9:00 AM - 5:00 PM', closed: false },
    { day: 'Thursday', hours: '9:00 AM - 5:00 PM', closed: false },
    { day: 'Friday', hours: '9:00 AM - 5:00 PM', closed: false },
    { day: 'Saturday', hours: '10:00 AM - 2:00 PM', closed: false },
    { day: 'Sunday', hours: '', closed: true },
  ];
});

function isToday(dayName: string): boolean {
  return highlightToday.value && dayNames[todayIndex.value] === dayName;
}

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="business-hours-block-wrapper" :class="{ 'is-selected': selected }" data-type="businessHours">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><Clock :size="12" /> Business Hours</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="hours-preview" contenteditable="false" @click="selectThisNode">
      <h3 class="hours-title">{{ title }}</h3>
      <div class="hours-list">
        <div
          v-for="(item, index) in days"
          :key="index"
          class="hours-row"
          :class="{ 'is-today': isToday(item.day), 'is-closed': item.closed }"
        >
          <span class="hours-day">{{ item.day }}</span>
          <span class="hours-time">{{ item.closed ? closedLabel : item.hours }}</span>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.business-hours-block-wrapper { position: relative; border: 2px dashed transparent; border-radius: 4px; transition: border-color 0.15s; margin: 8px 0; padding: 8px; }
.business-hours-block-wrapper:hover { border-color: #d1d5db; }
.business-hours-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls { position: absolute; top: -1px; left: -1px; right: -1px; display: flex; align-items: center; gap: 4px; opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none; }
.business-hours-block-wrapper:hover .block-controls, .business-hours-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.hours-preview { padding: 16px; }
.hours-title { font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 16px 0; }
.hours-list { display: flex; flex-direction: column; gap: 0; }
.hours-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
.hours-row:last-child { border-bottom: none; }
.hours-row.is-today { background: #eff6ff; border-radius: 6px; border-color: transparent; }
.hours-row.is-today .hours-day { color: #1677ff; font-weight: 600; }
.hours-day { font-size: 14px; font-weight: 500; color: #374151; }
.hours-time { font-size: 14px; color: #6b7280; }
.hours-row.is-closed .hours-time { color: #ef4444; font-weight: 500; }
</style>
