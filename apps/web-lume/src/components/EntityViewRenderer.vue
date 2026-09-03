<template>
  <div class="entity-view-renderer">
    <div class="view-switcher">
      <a-select :value="activeViewId" style="width: 220px" @change="$emit('view-change', $event)">
        <a-select-option v-for="v in views" :key="v.id" :value="v.id">{{ v.name }} ({{ v.type }})</a-select-option>
      </a-select>
      <a-button type="dashed" @click="$emit('view-create')">+ Add view</a-button>
      <a-button v-if="metadata?.type && metadata.type !== 'table'" @click="$emit('view-save')">Save view</a-button>
    </div>
    <div v-if="loading" class="view-loading"><a-skeleton active :paragraph="{ rows: 4 }" /></div>
    <div v-else-if="!activeView" class="view-empty"><a-empty description="No view selected" /></div>
    <KanbanBoard
      v-else-if="metadata?.kanban"
      :records="filteredRecords"
      :columns="metadata.kanban.columns"
      :column-field="metadata.kanban.columnField"
      :card-fields="metadata.columns"
      :column-widths="metadata.kanban.columnWidths"
      :show-no-value="metadata.kanban.showNoValue"
      @move="$emit('kanban-move', $event)"
      @column-resize="$emit('kanban-resize', $event)"
      @card-click="$emit('record-click', $event)"
    />
    <div v-else-if="metadata?.calendar" class="calendar-placeholder">
      <a-empty :description="`Calendar by ${metadata.calendar.dateField || 'date field'} — ${filteredRecords.length} records`" />
    </div>
    <DataTable
      v-else
      :data="filteredRecords"
      :columns="tableColumns"
      :loading="loading"
      @row-click="$emit('record-click', $event)"
    />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import KanbanBoard from './KanbanBoard.vue';
import DataTable from './DataTable.vue';
type ViewItem = { id: number | string; name: string; type: string };
type ViewMetadata = {
  type?: string;
  columns?: { name: string; label: string }[];
  filters?: { field?: string; name?: string; op?: string; operator?: string; value?: unknown }[];
  kanban?: { columns: string[]; columnField: string | null; columnWidths?: Record<string, number>; showNoValue?: boolean } | null;
  calendar?: { dateField?: string | null } | null;
};
type ViewRecord = Record<string, unknown>;
const props = withDefaults(defineProps<{
  views?: ViewItem[];
  activeViewId?: number | string | null;
  metadata?: ViewMetadata | null;
  records?: ViewRecord[];
  loading?: boolean;
}>(), { views: () => [], records: () => [], loading: false });
defineEmits(['view-change', 'view-create', 'view-save', 'kanban-move', 'kanban-resize', 'record-click']);
const activeView = computed(() => props.views.find(v => String(v.id) === String(props.activeViewId)) || null);
const tableColumns = computed(() => (props.metadata?.columns || []).map((c) => ({ key: c.name, title: c.label, dataIndex: c.name, sortable: true })));
const filteredRecords = computed(() => {
  const filters = props.metadata?.filters || [];
  if (!filters.length) return props.records;
  return props.records.filter(r => filters.every((f) => {
    const v = r[f.field || f.name || ''];
    const op = f.op || f.operator || 'eq';
    const target = f.value;
    if (op === 'eq') return String(v ?? '') === String(target ?? '');
    if (op === 'neq') return String(v ?? '') !== String(target ?? '');
    if (op === 'contains') return String(v ?? '').includes(String(target ?? ''));
    return true;
  }));
});
</script>
<style scoped>
.entity-view-renderer { display: flex; flex-direction: column; gap: 12px; }
.view-switcher { display: flex; gap: 8px; align-items: center; }
.view-loading { padding: 24px; }
.view-empty, .calendar-placeholder { padding: 48px 0; }
</style>
