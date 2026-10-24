<template>
  <div class="relationship-field">
    <a-select
      v-model:value="selectedValue"
      :options="linkedRecordOptions"
      :placeholder="`Select ${field.label || 'record'}`"
      :disabled="disabled"
      :mode="multiple ? 'multiple' : undefined"
      :allow-clear="true"
      :show-search="true"
      :filter-option="filterOption"
      @change="emitChange"
      @search="handleSearch"
      class="w-full"
    >
      <template #notFoundContent>
        <div class="text-center py-2 text-gray-500">
          No {{ field.label || 'records' }} found
        </div>
      </template>
    </a-select>

    <!-- Create New Record Option -->
    <div v-if="allowCreateNew" class="mt-2">
      <a-button
        type="dashed"
        class="w-full"
        :disabled="disabled"
        @click="showCreateModal = true"
      >
        <template #icon>
          <PlusOutlined />
        </template>
        Create new {{ field.label }}
      </a-button>
    </div>

    <!-- Create New Record Modal -->
    <a-modal
      v-model:open="showCreateModal"
      :title="`Create new ${field.label}`"
      @ok="handleCreateNew"
      @cancel="showCreateModal = false"
    >
      <div class="space-y-4">
        <!-- Form fields for new record would go here -->
        <p class="text-gray-500">
          Create a new {{ field.label }} record to link to this record.
        </p>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import * as recordApi from '../api/recordApi';

interface Field {
  id: number;
  name: string;
  label: string;
  type: string;
  relationship?: {
    linkedEntityId: number;
    displayField: string;
    type: 'many-to-one' | 'one-to-many' | 'many-to-many';
  };
}

interface LinkedRecord {
  id: number;
  name?: string;
  [key: string]: any;
}

const props = withDefaults(
  defineProps<{
    field: Field;
    modelValue: any;
    disabled?: boolean;
    multiple?: boolean;
    allowCreateNew?: boolean;
    entityId?: number;
  }>(),
  {
    disabled: false,
    multiple: false,
    allowCreateNew: false
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: any];
  change: [value: any];
}>();

const selectedValue = ref(props.modelValue);
const showCreateModal = ref(false);
const linkedRecords = ref<LinkedRecord[]>([]);
const loading = ref(false);
const searchQuery = ref('');

watch(
  () => props.modelValue,
  (newVal) => {
    selectedValue.value = newVal;
  }
);

// Load linked records on mount
const loadLinkedRecords = async () => {
  if (!props.field.relationship?.linkedEntityId) return;

  loading.value = true;
  try {
    const response = await recordApi.listRecords({
      entityId: props.field.relationship.linkedEntityId,
      limit: 100
    });

    linkedRecords.value = response.records;
  } catch (error) {
    console.error('Failed to load linked records:', error);
  } finally {
    loading.value = false;
  }
};

// Load records on mount
loadLinkedRecords();

// Format linked records for select options
const linkedRecordOptions = computed(() => {
  const displayField = props.field.relationship?.displayField || 'name';

  return linkedRecords.value.map((record) => {
    const displayValue = record.data?.[displayField] || record.data?.name || `Record ${record.id}`;

    return {
      label: displayValue,
      value: record.id,
      record
    };
  });
});

const filterOption = (input: string, option: any) => {
  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase());
};

const handleSearch = async (value: string) => {
  searchQuery.value = value;

  if (!props.field.relationship?.linkedEntityId || !value) return;

  loading.value = true;
  try {
    const response = await recordApi.listRecords({
      entityId: props.field.relationship.linkedEntityId,
      filters: [
        {
          field: props.field.relationship.displayField || 'name',
          operator: 'contains',
          value
        }
      ],
      limit: 50
    });

    linkedRecords.value = response.records;
  } catch (error) {
    console.error('Search failed:', error);
  } finally {
    loading.value = false;
  }
};

const emitChange = () => {
  emit('update:modelValue', selectedValue.value);
  emit('change', selectedValue.value);
};

const handleCreateNew = async () => {
  // Implementation would create a new record in the linked entity
  // and add it to the list
  showCreateModal.value = false;
};
</script>

<style scoped>
.relationship-field {
  width: 100%;
}
</style>
