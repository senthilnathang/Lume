<template>
  <div class="kanban-board">
    <div
      v-for="col in allColumns"
      :key="col.key"
      class="kanban-column"
      :style="{ width: (columnWidths[col.key] || 280) + 'px' }"
    >
      <div class="kanban-column-header" @mousedown.self="startResize($event, col.key)">
        <span class="kanban-column-title">{{ col.label }}</span>
        <a-badge :count="grouped[col.key]?.length || 0" :number-style="{ backgroundColor: '#f0f0f0', color: '#666' }" />
      </div>
      <draggable
        :list="grouped[col.key]"
        group="kanban"
        item-key="id"
        class="kanban-list"
        @change="(e) => onChange(e, col.key)"
      >
        <template #item="{ element }">
          <div class="kanban-card" @click="$emit('card-click', element)">
            <div v-for="f in cardFields" :key="f.name" class="kanban-card-field">
              <span class="kanban-card-label">{{ f.label }}:</span>
              <span class="kanban-card-value">{{ element[f.name] ?? '—' }}</span>
            </div>
          </div>
        </template>
      </draggable>
      <div v-if="!grouped[col.key]?.length" class="kanban-empty">No records</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import draggable from 'vuedraggable';
type CardField = { name: string; label: string };
type KanbanRecord = Record<string, unknown> & { id?: number | string };
const props = withDefaults(defineProps<{
  records?: KanbanRecord[];
  columns?: string[];
  columnField?: string | null;
  cardFields?: CardField[];
  columnWidths?: Record<string, number>;
  showNoValue?: boolean;
}>(), { records: () => [], columns: () => [], cardFields: () => [], columnWidths: () => ({}), showNoValue: true });
const emit = defineEmits(['move', 'column-resize', 'card-click']);
const localWidths = ref<Record<string, number>>({ ...props.columnWidths });
const allColumns = computed(() => {
  const cols = props.columns.map(c => ({ key: String(c), label: String(c) }));
  if (props.showNoValue && !cols.find(c => c.key === '__none__')) cols.push({ key: '__none__', label: 'No Value' });
  return cols;
});
const grouped = computed<Record<string, KanbanRecord[]>>(() => {
  const g: Record<string, KanbanRecord[]> = {};
  allColumns.value.forEach(c => { g[c.key] = []; });
  props.records.forEach(r => {
    const v = props.columnField ? r[props.columnField] : null;
    const key = v == null || v === '' ? '__none__' : String(v);
    if (!g[key]) g[key] = [];
    g[key].push(r);
  });
  return g;
});
function onChange(e: { added?: { element?: KanbanRecord } }, to: string) {
  if (e.added) emit('move', { recordId: e.added.element?.id, from: null, to: to === '__none__' ? null : to, record: e.added.element });
}
function startResize(e: MouseEvent, key: string) {
  const startX = e.clientX;
  const startW = localWidths.value[key] || 280;
  const move = (ev: MouseEvent) => { localWidths.value[key] = Math.max(200, Math.min(520, startW + ev.clientX - startX)); };
  const up = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
    emit('column-resize', { ...localWidths.value });
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}
</script>
<style scoped>
.kanban-board { display: flex; gap: 12px; overflow-x: auto; padding: 12px; min-height: 300px; }
.kanban-column { background: #fafafa; border: 1px solid #eee; border-radius: 8px; display: flex; flex-direction: column; flex-shrink: 0; }
.kanban-column-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; font-weight: 600; cursor: ew-resize; border-bottom: 1px solid #eee; }
.kanban-list { padding: 8px; display: flex; flex-direction: column; gap: 8px; min-height: 120px; }
.kanban-card { background: #fff; border: 1px solid #eee; border-radius: 6px; padding: 10px; cursor: pointer; }
.kanban-card:hover { border-color: #d9d9d9; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.kanban-card-field { font-size: 12px; margin-bottom: 4px; }
.kanban-card-label { color: #999; margin-right: 4px; }
.kanban-empty { text-align: center; color: #bbb; font-size: 12px; padding: 16px; }
</style>
