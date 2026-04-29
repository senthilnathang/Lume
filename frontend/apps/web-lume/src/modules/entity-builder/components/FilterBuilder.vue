<template>
  <div class="filter-builder">
    <div class="filter-header flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold">Filters</h3>
      <a-button type="primary" size="small" @click="addFilter">
        <template #icon>
          <PlusOutlined />
        </template>
        Add Filter
      </a-button>
    </div>

    <div class="filters-list space-y-3">
      <template v-for="(filter, index) in filters" :key="index">
        <div class="filter-row flex gap-2 items-end">
          <!-- Field Selection -->
          <a-select
            v-model:value="filter.field"
            :options="fieldOptions"
            placeholder="Field"
            style="min-width: 150px"
            @change="() => updateFilter(index)"
          />

          <!-- Operator Selection -->
          <a-select
            v-model:value="filter.operator"
            :options="operatorOptions(filter.field)"
            placeholder="Operator"
            style="min-width: 130px"
            @change="() => updateFilter(index)"
          />

          <!-- Value Input -->
          <input-value
            :field="selectedField(filter.field)"
            :operator="filter.operator"
            :model-value="filter.value"
            @update:model-value="(val) => (filter.value = val)"
            class="flex-1"
          />

          <!-- Remove Button -->
          <a-button
            danger
            type="text"
            size="small"
            @click="removeFilter(index)"
          >
            <template #icon>
              <DeleteOutlined />
            </template>
          </a-button>
        </div>
      </template>
    </div>

    <!-- Apply Button -->
    <div v-if="filters.length > 0" class="mt-4 flex gap-2">
      <a-button type="primary" @click="applyFilters">
        Apply Filters
      </a-button>
      <a-button @click="clearFilters">
        Clear All
      </a-button>
    </div>

    <!-- No Filters -->
    <div v-else class="text-gray-500 text-center py-4">
      No filters applied. Click "Add Filter" to start filtering.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import InputValue from './InputValue.vue';

interface FilterCondition {
  field: string;
  operator: string;
  value: any;
}

interface Field {
  id: number;
  name: string;
  label: string;
  type: string;
}

const props = withDefaults(
  defineProps<{
    fields: Field[];
    modelValue: FilterCondition[];
  }>(),
  {}
);

const emit = defineEmits<{
  'update:modelValue': [value: FilterCondition[]];
  apply: [filters: FilterCondition[]];
}>();

const filters = ref<FilterCondition[]>(props.modelValue || []);

const fieldOptions = computed(() => {
  return props.fields.map((field) => ({
    label: field.label,
    value: field.name
  }));
});

const operatorOptions = (fieldName: string) => {
  const field = props.fields.find((f) => f.name === fieldName);
  if (!field) return [];

  const baseOps = [
    { label: 'Equals', value: 'equals' },
    { label: 'Not Equals', value: 'neq' }
  ];

  switch (field.type) {
    case 'text':
    case 'email':
    case 'url':
      return [
        ...baseOps,
        { label: 'Contains', value: 'contains' },
        { label: 'Starts With', value: 'startsWith' },
        { label: 'Ends With', value: 'endsWith' }
      ];
    case 'number':
    case 'date':
    case 'datetime':
      return [
        ...baseOps,
        { label: 'Greater Than', value: 'gt' },
        { label: 'Greater or Equal', value: 'gte' },
        { label: 'Less Than', value: 'lt' },
        { label: 'Less or Equal', value: 'lte' },
        { label: 'Between', value: 'between' }
      ];
    case 'select':
      return [
        ...baseOps,
        { label: 'In', value: 'in' }
      ];
    case 'checkbox':
      return [
        { label: 'Is True', value: 'equals' },
        { label: 'Is False', value: 'neq' }
      ];
    default:
      return baseOps;
  }
};

const selectedField = (fieldName: string) => {
  return props.fields.find((f) => f.name === fieldName);
};

const addFilter = () => {
  filters.value.push({
    field: props.fields[0]?.name || '',
    operator: 'equals',
    value: null
  });
  updateFilters();
};

const removeFilter = (index: number) => {
  filters.value.splice(index, 1);
  updateFilters();
};

const updateFilter = (index: number) => {
  updateFilters();
};

const updateFilters = () => {
  emit('update:modelValue', filters.value);
};

const applyFilters = () => {
  emit('apply', filters.value);
};

const clearFilters = () => {
  filters.value = [];
  emit('update:modelValue', []);
  emit('apply', []);
};
</script>

<style scoped>
.filter-builder {
  padding: 16px;
  background: #f5f5f5;
  border-radius: 4px;
}

.filter-row {
  background: white;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}
</style>
