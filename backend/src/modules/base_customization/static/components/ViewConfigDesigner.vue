<template>
  <div class="vcd">
    <div class="vcd-section">
      <div class="vcd-title">Display</div>
      <a-form layout="vertical" size="small">
        <a-form-item label="Visible fields (comma-separated, empty = auto)">
          <a-input :value="draft.visibleFields.join(', ')" placeholder="e.g. name, status, created_at" @change="(e: Event) => setList('visibleFields', (e.target as HTMLInputElement).value)" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="Group by field"><a-input v-model:value="draft.groupBy" placeholder="e.g. status" allow-clear /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Page size"><a-input-number v-model:value="draft.pageSize" :min="5" :max="200" style="width: 100%" /></a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>
    <div class="vcd-section">
      <div class="vcd-title">Filters</div>
      <div v-if="!draft.filters.length" class="vcd-hint">No filters — all records shown</div>
      <div v-for="(f, i) in draft.filters" :key="i" class="vcd-row">
        <a-input v-model:value="f.field" size="small" placeholder="field" style="flex: 2" />
        <a-select v-model:value="f.op" size="small" style="flex: 1">
          <a-select-option value="eq">equals</a-select-option>
          <a-select-option value="neq">not equals</a-select-option>
          <a-select-option value="contains">contains</a-select-option>
          <a-select-option value="gt">greater than</a-select-option>
          <a-select-option value="lt">less than</a-select-option>
        </a-select>
        <a-input v-model:value="f.value" size="small" placeholder="value" style="flex: 2" />
        <a-button type="text" size="small" danger @click="draft.filters.splice(i, 1)">×</a-button>
      </div>
      <a-button size="small" type="dashed" block @click="draft.filters.push({ field: '', op: 'eq', value: '' })">+ Filter</a-button>
    </div>
    <div class="vcd-section">
      <div class="vcd-title">Sort</div>
      <div v-if="!draft.sort.length" class="vcd-hint">Default order</div>
      <div v-for="(s, i) in draft.sort" :key="i" class="vcd-row">
        <a-input v-model:value="s.field" size="small" placeholder="field" style="flex: 2" />
        <a-select v-model:value="s.direction" size="small" style="flex: 1">
          <a-select-option value="asc">ascending</a-select-option>
          <a-select-option value="desc">descending</a-select-option>
        </a-select>
        <a-button type="text" size="small" danger @click="draft.sort.splice(i, 1)">×</a-button>
      </div>
      <a-button size="small" type="dashed" block @click="draft.sort.push({ field: '', direction: 'asc' })">+ Sort rule</a-button>
    </div>
    <div v-if="viewType === 'kanban'" class="vcd-section">
      <div class="vcd-title">Kanban</div>
      <a-form layout="vertical" size="small">
        <a-form-item label="Column field (select field on the model)">
          <a-input v-model:value="draft.kanban.columnField" placeholder="e.g. stage" />
        </a-form-item>
        <a-form-item label="Column order (comma-separated, empty = option order)">
          <a-input :value="draft.kanban.columnOrder.join(', ')" placeholder="e.g. new, active, done" @change="(e: Event) => { draft.kanban.columnOrder = splitList((e.target as HTMLInputElement).value); }" />
        </a-form-item>
        <a-form-item label="Show 'No Value' column">
          <a-switch v-model:checked="draft.kanban.showNoValue" size="small" />
        </a-form-item>
      </a-form>
    </div>
    <div v-if="viewType === 'calendar'" class="vcd-section">
      <div class="vcd-title">Calendar</div>
      <a-form layout="vertical" size="small">
        <a-form-item label="Date field"><a-input v-model:value="draft.calendar.dateField" placeholder="e.g. due_date" /></a-form-item>
        <a-form-item label="End field (optional)"><a-input v-model:value="draft.calendar.endField" placeholder="e.g. end_date" allow-clear /></a-form-item>
      </a-form>
    </div>
    <div v-if="viewType === 'chart'" class="vcd-section">
      <div class="vcd-title">Chart</div>
      <a-form layout="vertical" size="small">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="Chart type">
              <a-select v-model:value="draft.chart.chartType">
                <a-select-option value="bar">Bar</a-select-option>
                <a-select-option value="line">Line</a-select-option>
                <a-select-option value="pie">Pie</a-select-option>
                <a-select-option value="donut">Donut</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Aggregate">
              <a-select v-model:value="draft.chart.aggregate">
                <a-select-option value="count">Count</a-select-option>
                <a-select-option value="sum">Sum</a-select-option>
                <a-select-option value="avg">Average</a-select-option>
                <a-select-option value="min">Min</a-select-option>
                <a-select-option value="max">Max</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="Label field"><a-input v-model:value="draft.chart.labelField" placeholder="e.g. status" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Value field"><a-input v-model:value="draft.chart.valueField" placeholder="e.g. amount" /></a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { reactive, watch } from 'vue';
type Filter = { field: string; op: string; value: string };
type Sort = { field: string; direction: string };
type Draft = {
  visibleFields: string[];
  groupBy: string;
  pageSize: number;
  filters: Filter[];
  sort: Sort[];
  kanban: { columnField: string; columnOrder: string[]; showNoValue: boolean };
  calendar: { dateField: string; endField: string };
  chart: { chartType: string; aggregate: string; labelField: string; valueField: string };
};
const props = defineProps<{ modelValue?: Record<string, unknown>; viewType?: string }>();
const emit = defineEmits(['update:modelValue']);
function splitList(raw: string): string[] {
  return (raw || '').split(',').map((s) => s.trim()).filter(Boolean);
}
function toDraft(input: Record<string, unknown>): Draft {
  const c = input || {};
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
  const filters = (Array.isArray(c.filters) ? c.filters : []).map((f: unknown) => {
    const o = (typeof f === 'object' && f !== null ? f : {}) as Record<string, unknown>;
    return { field: String(o.field || o.name || ''), op: String(o.op || o.operator || 'eq'), value: String(o.value ?? '') };
  });
  const sortSrc: unknown[] = Array.isArray(c.defaultSort) ? c.defaultSort : (Array.isArray(c.sortBy) ? c.sortBy : []);
  const kanban = ((c.kanban || {}) as Record<string, unknown>);
  const calendar = ((c.calendar || {}) as Record<string, unknown>);
  const chart = ((c.chart || {}) as Record<string, unknown>);
  return {
    visibleFields: arr(c.visibleFields).length ? arr(c.visibleFields) : arr(c.columns).map((x) => { try { const o = JSON.parse(x); return String(o.name || x); } catch { return x; } }),
    groupBy: String(c.groupBy || ''),
    pageSize: Number(c.pageSize) || 20,
    filters,
    sort: sortSrc.map((s: unknown) => {
      const o = (typeof s === 'object' && s !== null ? s : {}) as Record<string, unknown>;
      return { field: String(o.field || ''), direction: String(o.direction || 'asc') };
    }),
    kanban: {
      columnField: String(kanban.columnField || c.columnField || ''),
      columnOrder: arr(kanban.columnOrder).length ? arr(kanban.columnOrder) : splitList(String(c.columnOrder || '')),
      showNoValue: kanban.showNoValue ?? true,
    },
    calendar: { dateField: String(calendar.dateField || c.dateField || ''), endField: String(calendar.endField || c.endField || '') },
    chart: {
      chartType: String(chart.chartType || 'bar'), aggregate: String(chart.aggregate || 'count'),
      labelField: String(chart.labelField || ''), valueField: String(chart.valueField || ''),
    },
  };
}
const draft = reactive<Draft>(toDraft(props.modelValue || {}));
let syncing = false;
watch(() => props.modelValue, (v) => {
  if (syncing) return;
  syncing = true;
  try {
    Object.assign(draft, toDraft((v || {}) as Record<string, unknown>));
  } finally {
    setTimeout(() => { syncing = false; }, 0);
  }
}, { deep: true });
function setList(key: 'visibleFields', raw: string) {
  draft[key] = splitList(raw);
}
watch(draft, () => {
  if (syncing) return;
  syncing = true;
  const out: Record<string, unknown> = { ...(props.modelValue || {}) };
  out.visibleFields = [...draft.visibleFields];
  if (draft.visibleFields.length) out.columns = [...draft.visibleFields];
  out.groupBy = draft.groupBy || null;
  out.pageSize = draft.pageSize;
  out.filters = draft.filters.filter((f) => f.field).map((f) => ({ ...f }));
  out.defaultSort = draft.sort.filter((s) => s.field).map((s) => ({ ...s }));
  const vt = props.viewType || 'list';
  if (vt === 'kanban') {
    out.kanban = { columnField: draft.kanban.columnField || null, columnOrder: [...draft.kanban.columnOrder], showNoValue: draft.kanban.showNoValue };
  }
  if (vt === 'calendar') {
    out.calendar = { dateField: draft.calendar.dateField || null, endField: draft.calendar.endField || null };
  }
  if (vt === 'chart') {
    out.chart = { ...draft.chart };
  }
  emit('update:modelValue', out);
  setTimeout(() => { syncing = false; }, 0);
}, { deep: true });
</script>
<style scoped>
.vcd { display: flex; flex-direction: column; gap: 4px; }
.vcd-section { border: 1px solid #eee; border-radius: 8px; padding: 12px; margin-bottom: 12px; background: #fff; }
.vcd-title { font-size: 12px; font-weight: 600; color: #666; margin-bottom: 8px; text-transform: uppercase; }
.vcd-hint { color: #bbb; font-size: 12px; margin-bottom: 8px; }
.vcd-row { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
</style>
