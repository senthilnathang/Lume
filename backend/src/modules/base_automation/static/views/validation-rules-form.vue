<script setup>
import { ref, computed, onMounted, reactive, defineProps, defineEmits, watch } from 'vue'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  CodeOutlined,
} from '@ant-design/icons-vue'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Spin,
  Switch,
  Tag,
  Textarea,
  FormItem,
  SelectOption,
} from 'ant-design-vue'
import {
  getValidationRulesApi,
  createValidationRuleApi,
  updateValidationRuleApi,
  VALIDATION_TRIGGERS,
} from '#/api/base_automation'

const props = defineProps({
  ruleId: {
    type: [String, Number],
    default: null,
  },
})

const emit = defineEmits(['back', 'saved'])

const isEdit = computed(() => !!props.ruleId)

const loading = ref(false)
const saving = ref(false)

const form = reactive({
  code: '',
  name: '',
  description: '',
  model_name: '',
  error_message: '',
  error_condition: '',
  is_active: true,
  sequence: 10,
  trigger_on: 'both',
})

const triggerOptions = VALIDATION_TRIGGERS || [
  { value: 'create', label: 'On Create' },
  { value: 'update', label: 'On Update' },
  { value: 'both', label: 'On Create & Update' },
]

const hasValidationErrors = computed(() => {
  const errors = []
  if (!form.name.trim()) errors.push('Rule name is required')
  if (!form.code.trim()) errors.push('Rule code is required')
  if (!form.model_name.trim()) errors.push('Model name is required')
  return errors
})

const fetchRule = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const response = await getValidationRulesApi({ id: props.ruleId })
    const rules = response.items || response || []
    const ruleData = rules.find(r => r.id === parseInt(props.ruleId)) || rules[0]
    if (ruleData) {
      form.code = ruleData.code || ''
      form.name = ruleData.name || ''
      form.description = ruleData.description || ''
      form.model_name = ruleData.model_name || ''
      form.error_message = ruleData.error_message || ''
      form.error_condition = ruleData.error_condition || ''
      form.is_active = ruleData.is_active !== false
      form.sequence = ruleData.sequence || 10
      form.trigger_on = ruleData.trigger_on || 'both'
    }
  } catch (e) {
    message.error('Failed to load validation rule')
    emit('back')
  } finally {
    loading.value = false
  }
}

const generateCode = (name) => {
  if (!isEdit.value && name) {
    form.code = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  }
}

watch(() => form.name, (newVal) => {
  generateCode(newVal)
})

const handleSubmit = async () => {
  if (hasValidationErrors.value.length > 0) {
    message.error(hasValidationErrors.value[0])
    return
  }

  saving.value = true
  try {
    const payload = {
      code: form.code,
      name: form.name,
      description: form.description,
      model_name: form.model_name,
      error_message: form.error_message,
      error_condition: form.error_condition,
      is_active: form.is_active,
      sequence: form.sequence,
      trigger_on: form.trigger_on,
    }

    if (isEdit.value) {
      await updateValidationRuleApi(props.ruleId, payload)
      message.success('Validation rule updated successfully')
    } else {
      await createValidationRuleApi(payload)
      message.success('Validation rule created successfully')
    }
    emit('saved')
    emit('back')
  } catch (err) {
    message.error(err.response?.data?.detail || 'Failed to save validation rule')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (isEdit.value) {
    fetchRule()
  }
})
</script>

<template>
  <div class="validation-rule-form-page">
    <Spin :spinning="loading">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <Button type="text" class="back-btn" @click="emit('back')">
              <template #icon><ArrowLeftOutlined /></template>
            </Button>
            <div class="header-info">
              <h1 class="page-title">
                <CheckCircleOutlined />
                {{ isEdit ? 'Edit Validation Rule' : 'Create Validation Rule' }}
              </h1>
              <p class="page-subtitle">{{ isEdit ? 'Modify validation rule configuration' : 'Configure data validation rules' }}</p>
            </div>
          </div>
          <div class="header-actions">
            <Button size="large" @click="emit('back')">Cancel</Button>
            <Button type="primary" size="large" :loading="saving" @click="handleSubmit">
              <template #icon><SaveOutlined /></template>
              {{ isEdit ? 'Save Changes' : 'Create Rule' }}
            </Button>
          </div>
        </div>
      </div>

      <!-- Validation Errors -->
      <div v-if="hasValidationErrors.length > 0" class="validation-banner">
        <Alert type="warning" show-icon>
          <template #message>Please fix the following issues:</template>
          <template #description>
            <ul class="error-list">
              <li v-for="error in hasValidationErrors" :key="error">{{ error }}</li>
            </ul>
          </template>
        </Alert>
      </div>

      <!-- Main Content -->
      <div class="form-layout">
        <!-- Left Sidebar - Preview -->
        <div class="sidebar">
          <div class="preview-card">
            <div class="preview-header">
              <h3 class="preview-title">Rule Preview</h3>
              <Tag :color="form.is_active ? 'green' : 'default'">
                {{ form.is_active ? 'Active' : 'Inactive' }}
              </Tag>
            </div>

            <div class="preview-name">
              {{ form.name || 'Untitled Rule' }}
            </div>
            <div class="preview-code">
              <code>{{ form.code || 'rule_code' }}</code>
            </div>
            <div class="preview-description">
              {{ form.description || 'No description' }}
            </div>

            <div class="preview-section">
              <h4 class="section-title">Model</h4>
              <Tag color="blue">{{ form.model_name || 'Not specified' }}</Tag>
            </div>

            <div class="preview-section">
              <h4 class="section-title">Trigger</h4>
              <Tag color="purple">{{ form.trigger_on }}</Tag>
              <span class="sequence-badge">Sequence: {{ form.sequence }}</span>
            </div>

            <div class="preview-section" v-if="form.error_message">
              <h4 class="section-title">Error Message</h4>
              <div class="error-preview">{{ form.error_message }}</div>
            </div>
          </div>

          <!-- Quick Tips -->
          <div class="tips-card">
            <h4 class="tips-title">
              <InfoCircleOutlined /> Quick Tips
            </h4>
            <ul class="tips-list">
              <li>Error condition should return <strong>True</strong> when validation fails</li>
              <li>Use <code>record.get('field')</code> to access record values</li>
              <li>Lower sequence numbers run first</li>
              <li>Test your rule before activating</li>
            </ul>
          </div>
        </div>

        <!-- Right Content - Form -->
        <div class="main-content">
          <Card class="form-card">
            <Form layout="vertical">
              <Row :gutter="24">
                <Col :span="12">
                  <FormItem label="Rule Name" required>
                    <Input
                      v-model:value="form.name"
                      placeholder="e.g., Required Email Validation"
                      size="large"
                    />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Code" required>
                    <Input
                      v-model:value="form.code"
                      placeholder="rule_code"
                      size="large"
                      :disabled="isEdit"
                    />
                    <div class="help-text">Unique identifier. Cannot be changed after creation.</div>
                  </FormItem>
                </Col>
              </Row>

              <FormItem label="Model Name" required>
                <Input
                  v-model:value="form.model_name"
                  placeholder="e.g., Lead, Contact, Account"
                  size="large"
                />
              </FormItem>

              <FormItem label="Description">
                <Textarea
                  v-model:value="form.description"
                  placeholder="Describe what this validation rule checks..."
                  :rows="2"
                />
              </FormItem>

              <FormItem label="Error Condition">
                <Textarea
                  v-model:value="form.error_condition"
                  :rows="4"
                  placeholder="not record.get('email')"
                  class="code-input"
                />
                <div class="help-text">
                  <CodeOutlined /> Python expression that returns True when validation fails.
                </div>
              </FormItem>

              <FormItem label="Error Message">
                <Textarea
                  v-model:value="form.error_message"
                  :rows="2"
                  placeholder="Please provide a valid email address"
                />
                <div class="help-text">Message displayed when validation fails.</div>
              </FormItem>

              <Row :gutter="24">
                <Col :span="12">
                  <FormItem label="Trigger On">
                    <Select v-model:value="form.trigger_on" size="large">
                      <SelectOption v-for="t in triggerOptions" :key="t.value" :value="t.value">
                        {{ t.label }}
                      </SelectOption>
                    </Select>
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Sequence">
                    <InputNumber
                      v-model:value="form.sequence"
                      :min="1"
                      :max="1000"
                      style="width: 100%"
                      size="large"
                    />
                    <div class="help-text">Rules are evaluated in sequence order (lower first).</div>
                  </FormItem>
                </Col>
              </Row>

              <FormItem label="Status">
                <Switch v-model:checked="form.is_active" />
                <span class="switch-label">{{ form.is_active ? 'Active' : 'Inactive' }}</span>
              </FormItem>
            </Form>
          </Card>
        </div>
      </div>
    </Spin>
  </div>
</template>

<script>
export default {
  name: 'ValidationRuleFormPage',
}
</script>
