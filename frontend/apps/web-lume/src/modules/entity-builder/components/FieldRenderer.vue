<template>
  <div class="field-renderer">
    <!-- Text Field -->
    <template v-if="field.type === 'text'">
      <a-input
        v-model:value="localValue"
        :placeholder="field.label"
        :disabled="disabled"
        @change="emitChange"
        :status="error ? 'error' : ''"
      />
    </template>

    <!-- Email Field -->
    <template v-else-if="field.type === 'email'">
      <a-input
        v-model:value="localValue"
        type="email"
        :placeholder="field.label"
        :disabled="disabled"
        @change="emitChange"
        :status="error ? 'error' : ''"
      />
    </template>

    <!-- Number Field -->
    <template v-else-if="field.type === 'number'">
      <a-input-number
        v-model:value="localValue"
        :placeholder="field.label"
        :disabled="disabled"
        @change="emitChange"
        :style="{ width: '100%' }"
      />
    </template>

    <!-- Date Field -->
    <template v-else-if="field.type === 'date'">
      <a-date-picker
        v-model:value="localValue"
        format="YYYY-MM-DD"
        :disabled="disabled"
        @change="emitChange"
        :style="{ width: '100%' }"
      />
    </template>

    <!-- DateTime Field -->
    <template v-else-if="field.type === 'datetime'">
      <a-date-picker
        v-model:value="localValue"
        show-time
        format="YYYY-MM-DD HH:mm:ss"
        :disabled="disabled"
        @change="emitChange"
        :style="{ width: '100%' }"
      />
    </template>

    <!-- Select Field -->
    <template v-else-if="field.type === 'select'">
      <a-select
        v-model:value="localValue"
        :options="selectOptions"
        :placeholder="field.label"
        :disabled="disabled"
        @change="emitChange"
      />
    </template>

    <!-- Checkbox Field -->
    <template v-else-if="field.type === 'checkbox'">
      <a-checkbox
        v-model:checked="localValue"
        :disabled="disabled"
        @change="emitChange"
      >
        {{ field.label }}
      </a-checkbox>
    </template>

    <!-- Textarea Field -->
    <template v-else-if="field.type === 'textarea'">
      <a-textarea
        v-model:value="localValue"
        :placeholder="field.label"
        :disabled="disabled"
        :rows="4"
        @change="emitChange"
      />
    </template>

    <!-- URL Field -->
    <template v-else-if="field.type === 'url'">
      <a-input
        v-model:value="localValue"
        type="url"
        :placeholder="field.label"
        :disabled="disabled"
        @change="emitChange"
        :status="error ? 'error' : ''"
      />
    </template>

    <!-- Relationship Field -->
    <template v-else-if="field.type === 'relationship'">
      <RelationshipField
        :field="field"
        :value="localValue"
        :disabled="disabled"
        @change="emitChange"
      />
    </template>

    <!-- Default: Text -->
    <template v-else>
      <a-input
        v-model:value="localValue"
        :placeholder="field.label"
        :disabled="disabled"
        @change="emitChange"
      />
    </template>

    <!-- Error Message -->
    <div v-if="error" class="text-red-500 text-sm mt-1">
      {{ error }}
    </div>

    <!-- Help Text -->
    <div v-if="field.helpText" class="text-gray-500 text-sm mt-1">
      {{ field.helpText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import RelationshipField from './RelationshipField.vue';

interface Field {
  id: number;
  name: string;
  label: string;
  type: string;
  required?: boolean;
  helpText?: string;
  selectOptions?: any;
  validation?: any;
}

const props = withDefaults(
  defineProps<{
    field: Field;
    modelValue: any;
    disabled?: boolean;
    error?: string;
  }>(),
  {
    disabled: false,
    error: ''
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: any];
  change: [value: any];
}>();

const localValue = ref(props.modelValue);

watch(
  () => props.modelValue,
  (newVal) => {
    localValue.value = newVal;
  }
);

const selectOptions = computed(() => {
  if (!props.field.selectOptions) return [];

  if (typeof props.field.selectOptions === 'string') {
    try {
      const parsed = JSON.parse(props.field.selectOptions);
      return Array.isArray(parsed)
        ? parsed.map((opt: any) => ({
            label: typeof opt === 'string' ? opt : opt.label,
            value: typeof opt === 'string' ? opt : opt.value
          }))
        : [];
    } catch {
      return [];
    }
  }

  return props.field.selectOptions;
});

const emitChange = () => {
  emit('update:modelValue', localValue.value);
  emit('change', localValue.value);
};
</script>

<style scoped>
.field-renderer {
  width: 100%;
}
</style>
