<script>
/**
 * Rollup Field Form Component
 *
 * Form for creating and editing rollup summary fields.
 */
import { ref, computed, onMounted, reactive, watch } from 'vue';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  CalculatorOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons-vue';
import {
  Alert as AAlert,
  Button as AButton,
  Card as ACard,
  Col as ACol,
  Form as AForm,
  FormItem,
  Input as AInput,
  Row as ARow,
  Select as ASelect,
  SelectOption,
  Spin as ASpin,
  Switch as ASwitch,
  Tag as ATag,
  Textarea,
  message,
} from 'ant-design-vue';
import {
  getRollupFieldApi,
  createRollupFieldApi,
  updateRollupFieldApi,
  AGGREGATION_FUNCTIONS,
} from '#/api/base_automation';

export default {
  name: 'RollupFieldFormPage',
  components: {
    ArrowLeftOutlined,
    SaveOutlined,
    CalculatorOutlined,
    InfoCircleOutlined,
    AAlert,
    AButton,
    ACard,
    ACol,
    AForm,
    AFormItem: FormItem,
    AInput,
    ATextarea: Textarea,
    ARow,
    ASelect,
    ASelectOption: SelectOption,
    ASpin,
    ASwitch,
    ATag,
  },
  props: {
    fieldId: {
      type: [String, Number],
      default: null,
    },
  },
  emits: ['back', 'saved'],
  setup(props, { emit }) {
    const isEdit = computed(() => !!props.fieldId);

    const loading = ref(false);
    const saving = ref(false);

    const form = reactive({
      name: '',
      code: '',
      description: '',
      parent_model: '',
      child_model: '',
      parent_field: '',
      source_field: '',
      child_fk_field: '',
      aggregation: 'COUNT',
      filter_domain: '',
      is_active: true,
    });

    const availableModels = [
      { value: 'Account', label: 'Account' },
      { value: 'Contact', label: 'Contact' },
      { value: 'Opportunity', label: 'Opportunity' },
      { value: 'Case', label: 'Case' },
      { value: 'Employee', label: 'Employee' },
      { value: 'Department', label: 'Department' },
      { value: 'Project', label: 'Project' },
      { value: 'Task', label: 'Task' },
      { value: 'Invoice', label: 'Invoice' },
      { value: 'InvoiceLine', label: 'Invoice Line' },
    ];

    const aggregationOptions = AGGREGATION_FUNCTIONS || [
      { value: 'COUNT', label: 'Count', description: 'Count of child records', color: 'blue' },
      { value: 'SUM', label: 'Sum', description: 'Sum of field values', color: 'green' },
      { value: 'AVG', label: 'Average', description: 'Average of field values', color: 'orange' },
      { value: 'MIN', label: 'Minimum', description: 'Minimum field value', color: 'purple' },
      { value: 'MAX', label: 'Maximum', description: 'Maximum field value', color: 'red' },
    ];

    const getAggregationConfig = (fn) => {
      return aggregationOptions.find(a => a.value === fn) || aggregationOptions[0];
    };

    const hasValidationErrors = computed(() => {
      const errors = [];
      if (!form.name.trim()) errors.push('Name is required');
      if (!form.parent_model) errors.push('Parent model is required');
      if (!form.child_model) errors.push('Child model is required');
      if (!form.parent_field.trim()) errors.push('Parent field is required');
      if (!form.child_fk_field.trim()) errors.push('Child FK field is required');
      if (form.aggregation !== 'COUNT' && !form.source_field.trim()) {
        errors.push('Source field is required for ' + form.aggregation);
      }
      return errors;
    });

    const fetchRollup = async () => {
      if (!isEdit.value) return;
      loading.value = true;
      try {
        const detail = await getRollupFieldApi(props.fieldId);
        Object.assign(form, {
          name: detail.name || '',
          code: detail.code || '',
          description: detail.description || '',
          parent_model: detail.parent_model || '',
          child_model: detail.child_model || '',
          parent_field: detail.parent_field || '',
          source_field: detail.source_field || '',
          child_fk_field: detail.child_fk_field || '',
          aggregation: detail.aggregation || 'COUNT',
          filter_domain: detail.filter_domain
            ? JSON.stringify(detail.filter_domain, null, 2)
            : '',
          is_active: detail.is_active !== false,
        });
      } catch (e) {
        message.error('Failed to load rollup field');
        emit('back');
      } finally {
        loading.value = false;
      }
    };

    // Auto-generate code
    watch(() => form.name, (newName) => {
      if (!isEdit.value && newName) {
        form.code = newName.toLowerCase().replace(/\s+/g, '_');
      }
    });

    const handleSubmit = async () => {
      if (hasValidationErrors.value.length > 0) {
        message.error(hasValidationErrors.value[0]);
        return;
      }

      saving.value = true;
      try {
        const payload = {
          name: form.name,
          code: form.code || form.name.toLowerCase().replace(/\s+/g, '_'),
          description: form.description,
          parent_model: form.parent_model,
          child_model: form.child_model,
          parent_field: form.parent_field,
          source_field: form.source_field || null,
          child_fk_field: form.child_fk_field,
          aggregation: form.aggregation,
          is_active: form.is_active,
        };

        // Parse filter domain
        if (form.filter_domain) {
          try {
            payload.filter_domain = JSON.parse(form.filter_domain);
          } catch (e) {
            message.error('Invalid filter domain JSON');
            saving.value = false;
            return;
          }
        }

        if (isEdit.value) {
          await updateRollupFieldApi(props.fieldId, payload);
          message.success('Rollup field updated');
        } else {
          await createRollupFieldApi(payload);
          message.success('Rollup field created');
        }
        emit('saved');
        emit('back');
      } catch (err) {
        message.error(err.response?.data?.detail || 'Failed to save rollup field');
      } finally {
        saving.value = false;
      }
    };

    const handleBack = () => {
      emit('back');
    };

    onMounted(() => {
      if (isEdit.value) {
        fetchRollup();
      }
    });

    return {
      isEdit,
      loading,
      saving,
      form,
      availableModels,
      aggregationOptions,
      getAggregationConfig,
      hasValidationErrors,
      handleSubmit,
      handleBack,
    };
  },
};
</script>

<template>
  <div class="rollup-field-form-page">
    <ASpin :spinning="loading">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <AButton type="text" class="back-btn" @click="handleBack">
              <template #icon><ArrowLeftOutlined /></template>
            </AButton>
            <div class="header-info">
              <h1 class="page-title">
                <CalculatorOutlined />
                {{ isEdit ? 'Edit Rollup Field' : 'Create Rollup Field' }}
              </h1>
              <p class="page-subtitle">{{ isEdit ? 'Modify rollup summary configuration' : 'Configure automatic field aggregation from child records' }}</p>
            </div>
          </div>
          <div class="header-actions">
            <AButton size="large" @click="handleBack">Cancel</AButton>
            <AButton type="primary" size="large" :loading="saving" @click="handleSubmit">
              <template #icon><SaveOutlined /></template>
              {{ isEdit ? 'Save Changes' : 'Create Rollup' }}
            </AButton>
          </div>
        </div>
      </div>

      <!-- Validation Errors -->
      <div v-if="hasValidationErrors.length > 0" class="validation-banner">
        <AAlert type="warning" show-icon>
          <template #message>Please fix the following issues:</template>
          <template #description>
            <ul class="error-list">
              <li v-for="error in hasValidationErrors" :key="error">{{ error }}</li>
            </ul>
          </template>
        </AAlert>
      </div>

      <!-- Main Content -->
      <div class="form-layout">
        <!-- Left Sidebar - Preview -->
        <div class="sidebar">
          <div class="preview-card">
            <div class="preview-header">
              <h3 class="preview-title">Rollup Preview</h3>
              <ATag :color="form.is_active ? 'green' : 'default'">
                {{ form.is_active ? 'Active' : 'Inactive' }}
              </ATag>
            </div>

            <div class="preview-name">
              {{ form.name || 'Untitled Rollup' }}
            </div>
            <div class="preview-code">
              <code>{{ form.code || 'rollup_code' }}</code>
            </div>

            <div class="preview-section">
              <h4 class="section-title">Aggregation</h4>
              <ATag :color="getAggregationConfig(form.aggregation).color">
                {{ getAggregationConfig(form.aggregation).label }}
              </ATag>
              <div class="agg-description">
                {{ getAggregationConfig(form.aggregation).description }}
              </div>
            </div>

            <div class="preview-section">
              <h4 class="section-title">Relationship</h4>
              <div class="relationship-flow">
                <div class="model-box parent">
                  <span class="model-label">Parent</span>
                  <span class="model-name">{{ form.parent_model || '?' }}</span>
                  <span v-if="form.parent_field" class="field-name">.{{ form.parent_field }}</span>
                </div>
                <div class="arrow">&#8592;</div>
                <div class="model-box child">
                  <span class="model-label">Child</span>
                  <span class="model-name">{{ form.child_model || '?' }}</span>
                  <span v-if="form.source_field" class="field-name">.{{ form.source_field }}</span>
                </div>
              </div>
            </div>

            <div class="preview-section" v-if="form.filter_domain">
              <h4 class="section-title">Filter</h4>
              <code class="filter-code">{{ form.filter_domain.slice(0, 50) }}{{ form.filter_domain.length > 50 ? '...' : '' }}</code>
            </div>
          </div>

          <!-- Quick Tips -->
          <div class="tips-card">
            <h4 class="tips-title">
              <InfoCircleOutlined /> Quick Tips
            </h4>
            <ul class="tips-list">
              <li><strong>COUNT:</strong> Doesn't need a source field</li>
              <li><strong>SUM/AVG/MIN/MAX:</strong> Require a numeric source field</li>
              <li>Parent field stores the computed result</li>
              <li>Use filter to include only specific child records</li>
            </ul>
          </div>
        </div>

        <!-- Right Content - Form -->
        <div class="main-content">
          <ACard class="form-card">
            <AForm layout="vertical">
              <ARow :gutter="24">
                <ACol :span="12">
                  <AFormItem label="Name" required>
                    <AInput
                      v-model:value="form.name"
                      placeholder="e.g., Total Invoice Amount"
                      size="large"
                    />
                  </AFormItem>
                </ACol>
                <ACol :span="12">
                  <AFormItem label="Code">
                    <AInput
                      v-model:value="form.code"
                      placeholder="Auto-generated"
                      size="large"
                    />
                  </AFormItem>
                </ACol>
              </ARow>

              <AFormItem label="Description">
                <ATextarea
                  v-model:value="form.description"
                  :rows="2"
                  placeholder="Describe what this rollup calculates"
                />
              </AFormItem>

              <ARow :gutter="24">
                <ACol :span="12">
                  <AFormItem label="Parent Model" required>
                    <ASelect
                      v-model:value="form.parent_model"
                      placeholder="Select parent model"
                      size="large"
                      :options="availableModels"
                    />
                    <div class="help-text">The model where the aggregated value is stored</div>
                  </AFormItem>
                </ACol>
                <ACol :span="12">
                  <AFormItem label="Child Model" required>
                    <ASelect
                      v-model:value="form.child_model"
                      placeholder="Select child model"
                      size="large"
                      :options="availableModels"
                    />
                    <div class="help-text">The model to aggregate from</div>
                  </AFormItem>
                </ACol>
              </ARow>

              <ARow :gutter="24">
                <ACol :span="12">
                  <AFormItem label="Parent Field (stores result)" required>
                    <AInput
                      v-model:value="form.parent_field"
                      placeholder="e.g., total_amount"
                      size="large"
                    />
                    <div class="help-text">Field on parent to store the aggregated value</div>
                  </AFormItem>
                </ACol>
                <ACol :span="12">
                  <AFormItem label="Child FK Field" required>
                    <AInput
                      v-model:value="form.child_fk_field"
                      placeholder="e.g., parent_id"
                      size="large"
                    />
                    <div class="help-text">Foreign key field on child linking to parent</div>
                  </AFormItem>
                </ACol>
              </ARow>

              <ARow :gutter="24">
                <ACol :span="12">
                  <AFormItem label="Source Field (to aggregate)" :required="form.aggregation !== 'COUNT'">
                    <AInput
                      v-model:value="form.source_field"
                      placeholder="e.g., amount"
                      size="large"
                      :disabled="form.aggregation === 'COUNT'"
                    />
                    <div class="help-text">Field on child to aggregate (not needed for COUNT)</div>
                  </AFormItem>
                </ACol>
                <ACol :span="12">
                  <AFormItem label="Aggregation Function" required>
                    <ASelect v-model:value="form.aggregation" size="large">
                      <ASelectOption v-for="opt in aggregationOptions" :key="opt.value" :value="opt.value">
                        <div class="agg-option">
                          <ATag :color="opt.color" size="small">{{ opt.label }}</ATag>
                          <span class="agg-desc">{{ opt.description }}</span>
                        </div>
                      </ASelectOption>
                    </ASelect>
                  </AFormItem>
                </ACol>
              </ARow>

              <AFormItem label="Filter Criteria (JSON Domain)">
                <ATextarea
                  v-model:value="form.filter_domain"
                  :rows="3"
                  placeholder='[["status", "=", "active"]]'
                  class="code-input"
                />
                <div class="help-text">Only include child records matching this criteria</div>
              </AFormItem>

              <AFormItem label="Status">
                <ASwitch v-model:checked="form.is_active" />
                <span class="switch-label">{{ form.is_active ? 'Active' : 'Inactive' }}</span>
              </AFormItem>
            </AForm>
          </ACard>
        </div>
      </div>
    </ASpin>
  </div>
</template>
