<template>
  <div class="condition-builder">
    <!-- Match logic toggle -->
    <div class="builder-header">
      <Filter :size="14" class="builder-icon" />
      <span class="builder-label">Show this block when</span>
      <a-radio-group
        v-model:value="matchLogic"
        size="small"
        button-style="solid"
        @change="emitUpdate"
      >
        <a-radio-button value="all">ALL</a-radio-button>
        <a-radio-button value="any">ANY</a-radio-button>
      </a-radio-group>
      <span class="builder-label-suffix">conditions match</span>
    </div>

    <!-- Condition list -->
    <div class="condition-list">
      <div
        v-for="(condition, index) in conditions"
        :key="index"
        class="condition-row"
      >
        <!-- Condition type -->
        <a-select
          v-model:value="condition.type"
          size="small"
          style="width: 140px; flex-shrink: 0"
          @change="() => { condition.operator = 'is'; condition.value = null; emitUpdate(); }"
        >
          <a-select-option value="logged-in">Logged In</a-select-option>
          <a-select-option value="user-role">User Role</a-select-option>
          <a-select-option value="device">Device</a-select-option>
          <a-select-option value="date-range">Date Range</a-select-option>
          <a-select-option value="day-of-week">Day of Week</a-select-option>
          <a-select-option value="time-range">Time Range</a-select-option>
          <a-select-option value="url-param">URL Param</a-select-option>
          <a-select-option value="page-type">Page Type</a-select-option>
        </a-select>

        <!-- Operator (not shown for logged-in which has no value) -->
        <a-select
          v-if="condition.type !== 'logged-in'"
          v-model:value="condition.operator"
          size="small"
          style="width: 80px; flex-shrink: 0"
          @change="emitUpdate"
        >
          <a-select-option value="is">is</a-select-option>
          <a-select-option value="is-not">is not</a-select-option>
        </a-select>

        <!-- Value: logged-in — just a label -->
        <div v-if="condition.type === 'logged-in'" class="condition-value-label">
          user is logged in
        </div>

        <!-- Value: user-role -->
        <a-select
          v-else-if="condition.type === 'user-role'"
          v-model:value="condition.value"
          size="small"
          style="flex: 1"
          placeholder="Select role..."
          @change="emitUpdate"
        >
          <a-select-option value="admin">Admin</a-select-option>
          <a-select-option value="super_admin">Super Admin</a-select-option>
          <a-select-option value="editor">Editor</a-select-option>
          <a-select-option value="member">Member</a-select-option>
          <a-select-option value="guest">Guest</a-select-option>
        </a-select>

        <!-- Value: device -->
        <a-select
          v-else-if="condition.type === 'device'"
          v-model:value="condition.value"
          size="small"
          style="flex: 1"
          placeholder="Select device..."
          @change="emitUpdate"
        >
          <a-select-option value="desktop">Desktop</a-select-option>
          <a-select-option value="tablet">Tablet</a-select-option>
          <a-select-option value="mobile">Mobile</a-select-option>
        </a-select>

        <!-- Value: date-range -->
        <div v-else-if="condition.type === 'date-range'" class="condition-date-range">
          <a-date-picker
            :value="parseDateRange(condition.value).from"
            size="small"
            placeholder="From"
            style="flex: 1"
            @change="(val: any) => updateDateRange(condition, 'from', val)"
          />
          <span class="date-sep">–</span>
          <a-date-picker
            :value="parseDateRange(condition.value).to"
            size="small"
            placeholder="To"
            style="flex: 1"
            @change="(val: any) => updateDateRange(condition, 'to', val)"
          />
        </div>

        <!-- Value: day-of-week -->
        <a-checkbox-group
          v-else-if="condition.type === 'day-of-week'"
          :value="parseDays(condition.value)"
          style="flex: 1"
          @change="(vals: any) => { condition.value = vals; emitUpdate(); }"
        >
          <a-checkbox v-for="day in days" :key="day.value" :value="day.value">{{ day.label }}</a-checkbox>
        </a-checkbox-group>

        <!-- Value: time-range -->
        <div v-else-if="condition.type === 'time-range'" class="condition-date-range">
          <a-time-picker
            :value="parseTimeRange(condition.value).from"
            size="small"
            format="HH:mm"
            placeholder="From"
            style="flex: 1"
            @change="(val: any) => updateTimeRange(condition, 'from', val)"
          />
          <span class="date-sep">–</span>
          <a-time-picker
            :value="parseTimeRange(condition.value).to"
            size="small"
            format="HH:mm"
            placeholder="To"
            style="flex: 1"
            @change="(val: any) => updateTimeRange(condition, 'to', val)"
          />
        </div>

        <!-- Value: url-param -->
        <a-input
          v-else-if="condition.type === 'url-param'"
          :value="condition.value"
          size="small"
          style="flex: 1"
          placeholder="key=value"
          @change="(e: any) => { condition.value = e.target.value; emitUpdate(); }"
        />

        <!-- Value: page-type -->
        <a-select
          v-else-if="condition.type === 'page-type'"
          v-model:value="condition.value"
          size="small"
          style="flex: 1"
          placeholder="Select page type..."
          @change="emitUpdate"
        >
          <a-select-option value="page">Page</a-select-option>
          <a-select-option value="post">Post</a-select-option>
          <a-select-option value="archive">Archive</a-select-option>
          <a-select-option value="404">404</a-select-option>
          <a-select-option value="search">Search</a-select-option>
          <a-select-option value="front">Front Page</a-select-option>
        </a-select>

        <!-- Remove condition -->
        <button class="condition-remove-btn" @click="removeCondition(index)">
          <Trash2 :size="13" />
        </button>
      </div>

      <!-- Empty state -->
      <div v-if="conditions.length === 0" class="condition-empty">
        No conditions — block always visible
      </div>
    </div>

    <!-- Add condition -->
    <button class="condition-add-btn" @click="addCondition">
      <Plus :size="13" />
      Add Condition
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Plus, Trash2, Filter } from 'lucide-vue-next';

interface Condition {
  type: string;
  operator: 'is' | 'is-not';
  value: any;
}

interface ConditionsState {
  logic: 'all' | 'any';
  conditions: Condition[];
}

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const matchLogic = ref<'all' | 'any'>('all');
const conditions = ref<Condition[]>([]);

const days = [
  { label: 'Mon', value: 'mon' },
  { label: 'Tue', value: 'tue' },
  { label: 'Wed', value: 'wed' },
  { label: 'Thu', value: 'thu' },
  { label: 'Fri', value: 'fri' },
  { label: 'Sat', value: 'sat' },
  { label: 'Sun', value: 'sun' },
];

// Parse incoming modelValue
function parseValue(raw: string) {
  if (!raw) return;
  try {
    const parsed: ConditionsState = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object') {
      matchLogic.value = parsed.logic || 'all';
      conditions.value = Array.isArray(parsed.conditions) ? parsed.conditions : [];
    }
  } catch {
    conditions.value = [];
  }
}

parseValue(props.modelValue);

watch(() => props.modelValue, (val) => {
  parseValue(val);
}, { immediate: false });

function emitUpdate() {
  const state: ConditionsState = {
    logic: matchLogic.value,
    conditions: conditions.value,
  };
  emit('update:modelValue', JSON.stringify(state));
}

function addCondition() {
  conditions.value.push({ type: 'logged-in', operator: 'is', value: null });
  emitUpdate();
}

function removeCondition(index: number) {
  conditions.value.splice(index, 1);
  emitUpdate();
}

// --- Helpers for complex value types ---

function parseDateRange(value: any): { from: any; to: any } {
  if (!value || typeof value !== 'object') return { from: null, to: null };
  return { from: value.from || null, to: value.to || null };
}

function updateDateRange(condition: Condition, key: 'from' | 'to', val: any) {
  const current = parseDateRange(condition.value);
  current[key] = val;
  condition.value = current;
  emitUpdate();
}

function parseDays(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [];
}

function parseTimeRange(value: any): { from: any; to: any } {
  if (!value || typeof value !== 'object') return { from: null, to: null };
  return { from: value.from || null, to: value.to || null };
}

function updateTimeRange(condition: Condition, key: 'from' | 'to', val: any) {
  const current = parseTimeRange(condition.value);
  current[key] = val;
  condition.value = current;
  emitUpdate();
}
</script>

<style scoped>
.condition-builder {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.builder-header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.builder-icon {
  color: #f59e0b;
  flex-shrink: 0;
}

.builder-label,
.builder-label-suffix {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
}

.condition-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.condition-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  flex-wrap: wrap;
}

.condition-value-label {
  flex: 1;
  font-size: 12px;
  color: #374151;
  font-style: italic;
}

.condition-date-range {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.date-sep {
  font-size: 12px;
  color: #9ca3af;
  flex-shrink: 0;
}

.condition-remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
  border-radius: 4px;
  flex-shrink: 0;
  transition: background 0.15s;
}

.condition-remove-btn:hover {
  background: #fee2e2;
}

.condition-empty {
  padding: 8px;
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  font-style: italic;
}

.condition-add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px dashed #d9d9d9;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #6b7280;
  transition: all 0.15s;
  align-self: flex-start;
}

.condition-add-btn:hover {
  border-color: #f59e0b;
  color: #f59e0b;
}
</style>
