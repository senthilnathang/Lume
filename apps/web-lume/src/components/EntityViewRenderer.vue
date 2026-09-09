<template>
  <div class="entity-view-renderer">
    <div class="view-switcher">
      <a-select :value="activeViewId" style="width: 220px" @change="$emit('view-change', $event)">
        <a-select-option v-for="v in views" :key="v.id" :value="v.id">{{ v.name }} ({{ v.type }})</a-select-option>
      </a-select>
      <a-button type="dashed" @click="$emit('view-create')">+ Add view</a-button>
      <a-button v-if="metadata?.type && metadata.type !== 'table'" @click="$emit('view-save')">Save view</a-button>
      <a-button type="text" size="small" @click="showFilters = !showFilters">Filters{{ activeFilterCount ? ` (${activeFilterCount})` : '' }}</a-button>
    </div>
    <FilterBuilder
      v-if="showFilters"
      :fields="filterFields"
      :model-value="filterGroup"
      @update:model-value="onFiltersChange"
    />
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
import { computed, ref, watch } from 'vue';
import KanbanBoard from './KanbanBoard.vue';
import DataTable from './DataTable.vue';
import FilterBuilder, { type FilterGroup } from './FilterBuilder.vue';
type ViewItem = { id: number | string; name: string; type: string };
type ViewMetadata = {
  type?: string;
  columns?: { name: string; label: string; type?: string }[];
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
const emit = defineEmits(['view-change', 'view-create', 'view-save', 'kanban-move', 'kanban-resize', 'record-click', 'filters-change']);
const activeView = computed(() => props.views.find(v => String(v.id) === String(props.activeViewId)) || null);
const tableColumns = computed(() => (props.metadata?.columns || []).map((c) => ({ key: c.name, title: c.label, dataIndex: c.name, sortable: true })));
const showFilters = ref(false);
const filterOverride = ref<FilterGroup | null>(null);
watch(() => props.activeViewId, () => { filterOverride.value = null; });
const filterFields = computed(() => (props.metadata?.columns || []).map((c) => ({
  key: c.name,
  label: c.label,
  type: (c.type === 'number' ? 'number' : c.type === 'select' ? 'select' : c.type === 'date' || c.type === 'datetime' ? 'date' : 'text') as 'text' | 'number' | 'date' | 'select',
})));
const filterGroup = computed<FilterGroup>(() => filterOverride.value || {
  logic: 'and',
  conditions: (props.metadata?.filters || []).map((f) => ({
    field: f.field || f.name || '',
    op: f.op || f.operator || 'eq',
    value: f.value,
  })),
});
const activeFilterCount = computed(() => filterGroup.value.conditions.filter((c) => c.field).length);
function onFiltersChange(group: FilterGroup) {
  filterOverride.value = group;
  emit('filters-change', group);
}
function matches(value: unknown, op: string, target: unknown): boolean {
  if (op === 'eq') return String(value ?? '') === String(target ?? '');
  if (op === 'neq') return String(value ?? '') !== String(target ?? '');
  if (op === 'contains') return String(value ?? '').includes(String(target ?? ''));
  if (op === 'gt' || op === 'lt') {
    const a = Number(value);
    const b = Number(target);
    if (Number.isFinite(a) && Number.isFinite(b)) return op === 'gt' ? a > b : a < b;
    const cmp = String(value ?? '').localeCompare(String(target ?? ''));
    return op === 'gt' ? cmp > 0 : cmp < 0;
  }
  return true;
}
const filteredRecords = computed(() => {
  const group = filterGroup.value;
  const active = group.conditions.filter((c) => c.field);
  if (!active.length) return props.records;
  return props.records.filter((r) => {
    const results = active.map((f) => matches(r[f.field], f.op, f.value));
    return group.logic === 'or' ? results.some(Boolean) : results.every(Boolean);
  });
});
</script>
<style scoped>
.entity-view-renderer { display: flex; flex-direction: column; gap: 12px; }
.view-switcher { display: flex; gap: 8px; align-items: center; }
.view-loading { padding: 24px; }
.view-empty, .calendar-placeholder { padding: 48px 0; }
</style>
