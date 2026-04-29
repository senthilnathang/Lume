<template>
  <div class="form-view">
    <form @submit.prevent="submitForm">
      <div v-for="section in viewDefinition.config.sections" :key="section.id" class="form-section">
        <h3 v-if="section.label" class="section-label">{{ section.label }}</h3>
        <div class="section-rows">
          <div v-for="row in section.rows" :key="row" class="form-row">
            <div
              v-for="field in row.fields"
              :key="field.fieldName"
              :style="{ gridColumn: `span ${field.colspan || 1}` }"
              class="form-field"
            >
              <label class="field-label">{{ field.label || field.fieldName }}</label>
              <input
                v-model="formData[field.fieldName]"
                type="text"
                class="field-input"
                :placeholder="field.label || field.fieldName"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Save</button>
        <button type="button" class="btn btn-secondary" @click="resetForm">Cancel</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  viewDefinition: any;
  entityId: number;
}>();

const emit = defineEmits<{
  'record-updated': [record: any];
  'record-created': [record: any];
}>();

const formData = ref<Record<string, any>>({});

const submitForm = () => {
  emit('record-updated', formData.value);
};

const resetForm = () => {
  formData.value = {};
};
</script>

<style scoped>
.form-view {
  padding: 20px;
}

.form-section {
  margin-bottom: 30px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 20px;
}

.section-label {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 15px;
  color: #333;
}

.section-rows {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}

.form-field {
  display: flex;
  flex-direction: column;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 5px;
  color: #555;
}

.field-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.field-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #1890ff;
  color: white;
}

.btn-primary:hover {
  background-color: #0050b3;
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}
</style>
