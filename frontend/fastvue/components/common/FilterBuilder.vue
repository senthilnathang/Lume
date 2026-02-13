<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import {
  Button,
  Card,
  DatePicker,
  Dropdown,
  Input,
  InputNumber,
  Menu,
  Select,
  Space,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import {
  CloseOutlined,
  DeleteOutlined,
  FilterOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';

defineOptions({
  name: 'FilterBuilder',
});

// Types
export type FieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';
export type Operator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'is_empty'
  | 'is_not_empty'
  | 'is_true'
  | 'is_false';

export type LogicalOperator = 'and' | 'or';

export interface FilterField {
  key: string;
  label: string;
  type: FieldType;
  options?: { label: string; value: any }[]; // For select type
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: Operator;
  value: any;
}

export interface FilterGroup {
  id: string;
  logic: LogicalOperator;
  conditions: FilterCondition[];
}

// Props
const props = withDefaults(
  defineProps<{
    fields: FilterField[];
    modelValue?: FilterGroup;
    showLogicToggle?: boolean;
    maxConditions?: number;
    placeholder?: string;
  }>(),
  {
    showLogicToggle: true,
    maxConditions: 10,
    placeholder: 'Add filter condition...',
  }
);

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: FilterGroup): void;
  (e: 'apply', filters: FilterGroup): void;
  (e: 'clear'): void;
}>();

// State
const isExpanded = ref(false);
const filterGroup = ref<FilterGroup>(
  props.modelValue || {
    id: generateId(),
    logic: 'and',
    conditions: [],
  }
);

// Operator definitions by field type
const operatorsByType: Record<FieldType, { value: Operator; label: string }[]> = {
  text: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'greater_than_or_equal', label: 'Greater than or equal' },
    { value: 'less_than_or_equal', label: 'Less than or equal' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  date: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
    { value: 'greater_than', label: 'After' },
    { value: 'less_than', label: 'Before' },
    { value: 'greater_than_or_equal', label: 'On or after' },
    { value: 'less_than_or_equal', label: 'On or before' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  select: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  boolean: [
    { value: 'is_true', label: 'Is true' },
    { value: 'is_false', label: 'Is false' },
  ],
};

// Computed
const activeFilterCount = computed(() => filterGroup.value.conditions.length);

const canAddCondition = computed(() =>
  filterGroup.value.conditions.length < props.maxConditions
);

const fieldOptions = computed(() =>
  props.fields.map(f => ({ label: f.label, value: f.key }))
);

// Map for O(1) field lookups instead of O(n) array.find()
const fieldMap = computed(() =>
  new Map(props.fields.map(f => [f.key, f]))
);

// Pre-compute operators for each field to avoid repeated lookups
const fieldOperatorsMap = computed(() => {
  const map = new Map<string, { value: Operator; label: string }[]>();
  for (const field of props.fields) {
    map.set(field.key, operatorsByType[field.type] || operatorsByType.text);
  }
  return map;
});

// Methods
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function getFieldByKey(key: string): FilterField | undefined {
  return fieldMap.value.get(key);
}

function getOperatorsForField(fieldKey: string) {
  return fieldOperatorsMap.value.get(fieldKey) || [];
}

function getOperatorLabel(operator: Operator): string {
  for (const type of Object.values(operatorsByType)) {
    const found = type.find(o => o.value === operator);
    if (found) return found.label;
  }
  return operator;
}

function isValuelessOperator(operator: Operator): boolean {
  return ['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(operator);
}

function addCondition(fieldKey?: string) {
  if (!canAddCondition.value) return;

  const field = fieldKey
    ? getFieldByKey(fieldKey)
    : props.fields[0];

  if (!field) return;

  const operators = operatorsByType[field.type];
  const defaultOperator = operators[0]?.value || 'equals';

  filterGroup.value.conditions.push({
    id: generateId(),
    field: field.key,
    operator: defaultOperator,
    value: null,
  });

  isExpanded.value = true;
  emitUpdate();
}

function removeCondition(conditionId: string) {
  const index = filterGroup.value.conditions.findIndex(c => c.id === conditionId);
  if (index > -1) {
    filterGroup.value.conditions.splice(index, 1);
    emitUpdate();
  }
}

function updateConditionField(condition: FilterCondition, fieldKey: string) {
  const field = getFieldByKey(fieldKey);
  if (!field) return;

  condition.field = fieldKey;
  const operators = operatorsByType[field.type];
  condition.operator = operators[0]?.value || 'equals';
  condition.value = null;
  emitUpdate();
}

function updateConditionOperator(condition: FilterCondition, operator: Operator) {
  condition.operator = operator;
  if (isValuelessOperator(operator)) {
    condition.value = null;
  }
  emitUpdate();
}

function updateConditionValue(condition: FilterCondition, value: any) {
  condition.value = value;
  emitUpdate();
}

function toggleLogic() {
  filterGroup.value.logic = filterGroup.value.logic === 'and' ? 'or' : 'and';
  emitUpdate();
}

function clearFilters() {
  filterGroup.value.conditions = [];
  emit('clear');
  emitUpdate();
}

function applyFilters() {
  emit('apply', filterGroup.value);
}

function emitUpdate() {
  emit('update:modelValue', filterGroup.value);
}

// Watch for external model changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      filterGroup.value = newValue;
    }
  },
  { deep: true }
);
</script>

<template>
  <div class="filter-builder">
    <!-- Filter Header / Toggle -->
    <div class="filter-builder__header">
      <Button
        :type="activeFilterCount > 0 ? 'primary' : 'default'"
        ghost
        @click="isExpanded = !isExpanded"
      >
        <template #icon><FilterOutlined /></template>
        Filters
        <Tag v-if="activeFilterCount > 0" color="blue" class="ml-2">
          {{ activeFilterCount }}
        </Tag>
      </Button>

      <Dropdown v-if="canAddCondition" :trigger="['click']">
        <Button type="dashed" size="small">
          <template #icon><PlusOutlined /></template>
          Add Filter
        </Button>
        <template #overlay>
          <Menu @click="({ key }) => addCondition(key as string)">
            <Menu.Item v-for="field in fields" :key="field.key">
              {{ field.label }}
            </Menu.Item>
          </Menu>
        </template>
      </Dropdown>

      <template v-if="activeFilterCount > 0">
        <Button size="small" @click="applyFilters">Apply</Button>
        <Button size="small" danger @click="clearFilters">
          <template #icon><DeleteOutlined /></template>
          Clear All
        </Button>
      </template>
    </div>

    <!-- Filter Conditions Panel -->
    <Card
      v-if="isExpanded && filterGroup.conditions.length > 0"
      class="filter-builder__panel"
      size="small"
    >
      <div class="filter-builder__conditions">
        <div
          v-for="(condition, index) in filterGroup.conditions"
          :key="condition.id"
          class="filter-builder__condition"
        >
          <!-- Logic Connector (AND/OR) -->
          <div v-if="index > 0 && showLogicToggle" class="filter-builder__logic">
            <Button
              size="small"
              type="link"
              @click="toggleLogic"
            >
              {{ filterGroup.logic.toUpperCase() }}
            </Button>
          </div>
          <div v-else-if="index > 0" class="filter-builder__logic-label">
            {{ filterGroup.logic.toUpperCase() }}
          </div>

          <!-- Condition Row -->
          <div class="filter-builder__row">
            <!-- Field Selector -->
            <Select
              :value="condition.field"
              :options="fieldOptions"
              style="width: 150px"
              size="small"
              @change="(val: any) => updateConditionField(condition, val)"
            />

            <!-- Operator Selector -->
            <Select
              :value="condition.operator"
              :options="getOperatorsForField(condition.field)"
              style="width: 160px"
              size="small"
              @change="(val: any) => updateConditionOperator(condition, val)"
            />

            <!-- Value Input (based on field type) -->
            <template v-if="!isValuelessOperator(condition.operator)">
              <template v-if="getFieldByKey(condition.field)?.type === 'number'">
                <InputNumber
                  :value="condition.value"
                  placeholder="Enter value"
                  size="small"
                  style="width: 150px"
                  @update:value="(val) => updateConditionValue(condition, val)"
                />
              </template>

              <template v-else-if="getFieldByKey(condition.field)?.type === 'date'">
                <DatePicker
                  :value="condition.value"
                  size="small"
                  style="width: 150px"
                  @update:value="(val) => updateConditionValue(condition, val)"
                />
              </template>

              <template v-else-if="getFieldByKey(condition.field)?.type === 'select'">
                <Select
                  :value="condition.value"
                  :options="getFieldByKey(condition.field)?.options || []"
                  placeholder="Select value"
                  size="small"
                  style="width: 150px"
                  allow-clear
                  @change="(val) => updateConditionValue(condition, val)"
                />
              </template>

              <template v-else-if="getFieldByKey(condition.field)?.type === 'boolean'">
                <Select
                  :value="condition.value"
                  :options="([
                    { label: 'True', value: true },
                    { label: 'False', value: false },
                  ] as any)"
                  placeholder="Select"
                  size="small"
                  style="width: 150px"
                  @change="(val) => updateConditionValue(condition, val)"
                />
              </template>

              <template v-else>
                <Input
                  :value="condition.value"
                  placeholder="Enter value"
                  size="small"
                  style="width: 150px"
                  @update:value="(val) => updateConditionValue(condition, val)"
                />
              </template>
            </template>

            <!-- Remove Button -->
            <Tooltip title="Remove filter">
              <Button
                type="text"
                size="small"
                danger
                @click="removeCondition(condition.id)"
              >
                <template #icon><CloseOutlined /></template>
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      <!-- Panel Footer -->
      <div class="filter-builder__footer">
        <Space>
          <Button
            v-if="canAddCondition"
            type="dashed"
            size="small"
            @click="addCondition()"
          >
            <template #icon><PlusOutlined /></template>
            Add Condition
          </Button>
        </Space>
        <Space>
          <Button size="small" @click="isExpanded = false">Close</Button>
          <Button type="primary" size="small" @click="applyFilters">
            Apply Filters
          </Button>
        </Space>
      </div>
    </Card>

    <!-- Active Filter Tags (collapsed view) -->
    <div
      v-if="!isExpanded && filterGroup.conditions.length > 0"
      class="filter-builder__tags"
    >
      <Tag
        v-for="condition in filterGroup.conditions"
        :key="condition.id"
        closable
        color="blue"
        @close="removeCondition(condition.id)"
      >
        {{ getFieldByKey(condition.field)?.label }}
        {{ getOperatorLabel(condition.operator).toLowerCase() }}
        <template v-if="!isValuelessOperator(condition.operator)">
          "{{ condition.value }}"
        </template>
      </Tag>
    </div>
  </div>
</template>

<style scoped>
.filter-builder {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-builder__header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-builder__panel {
  margin-top: 8px;
}

.filter-builder__conditions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-builder__condition {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-builder__logic {
  display: flex;
  align-items: center;
  padding: 4px 0;
}

.filter-builder__logic-label {
  font-size: 12px;
  font-weight: 600;
  color: #1890ff;
  padding: 4px 8px;
}

.filter-builder__row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-builder__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.filter-builder__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* Dark mode */
:root.dark .filter-builder__footer {
  border-color: #303030;
}

:root.dark .filter-builder__logic-label {
  color: #40a9ff;
}
</style>
