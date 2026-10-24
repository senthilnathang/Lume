<template>
  <div class="filter-builder">
    <div class="filter-logic">
      <span class="filter-label">Match</span>
      <a-segmented :value="model.logic" :options="[{ label: 'All', value: 'and' }, { label: 'Any', value: 'or' }]" size="small" @change="(v: string | number) => updateLogic(String(v) as 'and' | 'or')" />
    </div>
    <div v-if="!model.conditions.length" class="filter-empty">No filters — showing all records</div>
    <div v-for="(condition, i) in model.conditions" :key="i" class="filter-row">
      <a-select :value="condition.field" size="small" placeholder="Field" style="flex: 2" @change="(v: string) => updateCondition(i, { field: v })">
        <a-select-option v-for="f in fields" :key="f.key" :value="f.key">{{ f.label }}</a-select-option>
      </a-select>
      <a-select :value="condition.op" size="small" style="flex: 1" @change="(v: string) => updateCondition(i, { op: v })">
        <a-select-option v-for="op in opsFor(condition.field)" :key="op.value" :value="op.value">{{ op.label }}</a-select-option>
      </a-select>
      <a-select
        v-if="fieldTypeOf(condition.field) === 'select'"
        :value="condition.value"
        size="small"
        placeholder="Value"
        style="flex: 2"
        allow-clear
        @change="(v: string) => updateCondition(i, { value: v })"
      >
        <a-select-option v-for="opt in fieldOptionsOf(condition.field)" :key="opt" :value="opt">{{ opt }}</a-select-option>
      </a-select>
      <a-input-number
        v-else-if="fieldTypeOf(condition.field) === 'number'"
        :value="typeof condition.value === 'number' ? condition.value : undefined"
        size="small"
        placeholder="Value"
        style="flex: 2; width: 100%"
        @change="(v: number | string | null) => updateCondition(i, { value: v === null ? '' : v })"
      />
      <a-input
        v-else
        :value="String(condition.value ?? '')"
        size="small"
        placeholder="Value"
        style="flex: 2"
        @change="(e: Event) => updateCondition(i, { value: (e.target as HTMLInputElement).value })"
      />
      <a-button type="text" size="small" danger @click="removeCondition(i)">×</a-button>
    </div>
    <a-button size="small" type="dashed" block @click="addCondition">+ Filter</a-button>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';

export type FilterFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';
export interface FilterField {
  key: string;
  label: string;
  type?: FilterFieldType;
  options?: string[];
}
export interface FilterCondition {
  field: string;
  op: string;
  value: unknown;
}
export interface FilterGroup {
  logic: 'and' | 'or';
  conditions: FilterCondition[];
}

const props = withDefaults(defineProps<{
  fields?: FilterField[];
  modelValue?: FilterGroup | null;
}>(), { fields: () => [], modelValue: null });
const emit = defineEmits(['update:modelValue']);

const model = computed<FilterGroup>(() => props.modelValue || { logic: 'and', conditions: [] });

const OPS: Record<FilterFieldType, { value: string; label: string }[]> = {
  text: [
    { value: 'eq', label: 'is' },
    { value: 'neq', label: 'is not' },
    { value: 'contains', label: 'contains' },
  ],
  number: [
    { value: 'eq', label: '=' },
    { value: 'neq', label: '≠' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
  ],
  date: [
    { value: 'eq', label: 'on' },
    { value: 'gt', label: 'after' },
    { value: 'lt', label: 'before' },
  ],
  select: [
    { value: 'eq', label: 'is' },
    { value: 'neq', label: 'is not' },
  ],
  boolean: [
    { value: 'eq', label: 'is' },
  ],
};

function fieldTypeOf(key: string): FilterFieldType {
  return props.fields.find((f) => f.key === key)?.type || 'text';
}

function fieldOptionsOf(key: string): string[] {
  return props.fields.find((f) => f.key === key)?.options || [];
}

function opsFor(key: string) {
  return OPS[fieldTypeOf(key)] || OPS.text;
}

function clone(): FilterGroup {
  return {
    logic: model.value.logic,
    conditions: model.value.conditions.map((c) => ({ ...c })),
  };
}

function updateLogic(logic: 'and' | 'or') {
  const next = clone();
  next.logic = logic;
  emit('update:modelValue', next);
}

function updateCondition(index: number, patch: Partial<FilterCondition>) {
  const next = clone();
  next.conditions[index] = { ...next.conditions[index], ...patch };
  emit('update:modelValue', next);
}

function addCondition() {
  const next = clone();
  next.conditions.push({ field: props.fields[0]?.key || '', op: 'eq', value: '' });
  emit('update:modelValue', next);
}

function removeCondition(index: number) {
  const next = clone();
  next.conditions.splice(index, 1);
  emit('update:modelValue', next);
}
</script>
<style scoped>
.filter-builder { display: flex; flex-direction: column; gap: 8px; }
.filter-logic { display: flex; align-items: center; gap: 8px; }
.filter-label { font-size: 12px; color: #999; }
.filter-empty { font-size: 12px; color: #bbb; }
.filter-row { display: flex; gap: 6px; align-items: center; }
</style>
