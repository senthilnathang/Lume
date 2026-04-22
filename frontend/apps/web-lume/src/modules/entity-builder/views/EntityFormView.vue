<template>
  <div class="entity-form-view">
    <a-form
      :model="formData"
      :rules="validationRules"
      layout="vertical"
      @finish="handleSubmit"
      @finishFailed="handleSubmitFailed"
    >
      <a-form-item
        v-for="field in entity?.fields || []"
        :key="field.id"
        :name="field.name"
        :label="field.label"
        :rules="getRules(field)"
      >
        <FieldRenderer
          :field="field"
          :model-value="formData[field.name]"
          :error="errors[field.name]"
          @update:model-value="formData[field.name] = $event"
        />
      </a-form-item>

      <a-form-item>
        <div class="flex gap-2">
          <a-button type="primary" html-type="submit" :loading="saving">
            {{ mode === 'edit' ? 'Update' : 'Create' }}
          </a-button>
          <a-button @click="$emit('cancel')">
            Cancel
          </a-button>
        </div>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import * as recordApi from '../api/recordApi';
import FieldRenderer from '../components/FieldRenderer.vue';

interface Field {
  id: number;
  name: string;
  label: string;
  type: string;
  required?: boolean;
  validation?: any;
}

const props = withDefaults(
  defineProps<{
    entityId: number;
    entity?: { fields: Field[] };
    record?: any;
    mode: 'create' | 'edit';
  }>(),
  {
    mode: 'create'
  }
);

const emit = defineEmits<{
  submit: [record: any];
  cancel: [];
}>();

const formData = ref<any>({});
const errors = ref<any>({});
const saving = ref(false);

// Initialize form data
onMounted(() => {
  if (props.mode === 'edit' && props.record) {
    formData.value = { ...props.record.data };
  } else {
    props.entity?.fields?.forEach((field: Field) => {
      formData.value[field.name] = null;
    });
  }
});

const getRules = (field: Field) => {
  const rules = [];

  if (field.required) {
    rules.push({
      required: true,
      message: `${field.label} is required`
    });
  }

  // Add validation rules based on field type
  if (field.type === 'email') {
    rules.push({
      type: 'email',
      message: 'Please enter a valid email'
    });
  }

  if (field.type === 'url') {
    rules.push({
      type: 'url',
      message: 'Please enter a valid URL'
    });
  }

  return rules;
};

const validationRules = computed(() => {
  const rules: any = {};
  props.entity?.fields?.forEach((field: Field) => {
    rules[field.name] = getRules(field);
  });
  return rules;
});

const handleSubmit = async () => {
  saving.value = true;
  errors.value = {};

  try {
    if (props.mode === 'edit' && props.record) {
      await recordApi.updateRecord(
        props.entityId,
        props.record.id,
        formData.value
      );
      message.success('Record updated successfully');
    } else {
      await recordApi.createRecord({
        entityId: props.entityId,
        data: formData.value
      });
      message.success('Record created successfully');
    }

    emit('submit', formData.value);
  } catch (error: any) {
    if (error.errors) {
      errors.value = error.errors;
    }
    message.error(error.message || 'Failed to save record');
  } finally {
    saving.value = false;
  }
};

const handleSubmitFailed = () => {
  message.error('Please fix the validation errors');
};
</script>

<style scoped>
.entity-form-view {
  padding: 20px;
  max-width: 600px;
}
</style>
