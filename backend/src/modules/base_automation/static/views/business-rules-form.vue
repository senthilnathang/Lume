<script setup>
import { ref, computed, onMounted, reactive, defineProps, defineEmits } from 'vue'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  FilterOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons-vue'
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Tabs,
  TabPane,
  Textarea,
  FormItem,
  SelectOption,
} from 'ant-design-vue'
import {
  getBusinessRuleApi,
  createBusinessRuleApi,
  updateBusinessRuleApi,
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
const activeTab = ref('basic')

const form = reactive({
  name: '',
  description: '',
  entity_type: 'hr.leave',
  trigger_on: ['AFTER_CREATE'],
  priority: 100,
  is_active: true,
  conditions: [],
  actions: [],
})

const entityTypes = [
  { value: 'hr.leave', label: 'Leave Request', color: '#52c41a' },
  { value: 'hr.expense', label: 'Expense', color: '#1890ff' },
  { value: 'hr.travel', label: 'Travel Request', color: '#722ed1' },
  { value: 'hr.loan', label: 'Loan Request', color: '#fa8c16' },
  { value: 'hr.overtime', label: 'Overtime', color: '#13c2c2' },
  { value: 'purchase.order', label: 'Purchase Order', color: '#eb2f96' },
]

const triggerOptions = [
  { value: 'BEFORE_CREATE', label: 'Before Create' },
  { value: 'AFTER_CREATE', label: 'After Create' },
  { value: 'BEFORE_UPDATE', label: 'Before Update' },
  { value: 'AFTER_UPDATE', label: 'After Update' },
  { value: 'ON_STATUS_CHANGE', label: 'On Status Change' },
  { value: 'ON_APPROVAL', label: 'On Approval' },
]

const operatorOptions = [
  { value: 'EQ', label: 'Equals (=)' },
  { value: 'NE', label: 'Not Equals (!=)' },
  { value: 'GT', label: 'Greater Than (>)' },
  { value: 'LT', label: 'Less Than (<)' },
  { value: 'GTE', label: 'Greater or Equal (>=)' },
  { value: 'LTE', label: 'Less or Equal (<=)' },
  { value: 'IN', label: 'In List' },
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'STARTS_WITH', label: 'Starts With' },
  { value: 'IS_NULL', label: 'Is Null' },
  { value: 'IS_NOT_NULL', label: 'Is Not Null' },
]

const actionTypeOptions = [
  { value: 'SET_FIELD', label: 'Set Field', color: 'blue' },
  { value: 'VALIDATE', label: 'Validate', color: 'orange' },
  { value: 'REQUIRE_APPROVAL', label: 'Require Approval', color: 'purple' },
  { value: 'SEND_EMAIL', label: 'Send Email', color: 'green' },
  { value: 'WEBHOOK', label: 'Webhook', color: 'cyan' },
  { value: 'LOG', label: 'Log', color: 'default' },
]

const getEntityTypeConfig = (type) => {
  return entityTypes.find(t => t.value === type) || { label: type, color: '#1890ff' }
}

const getOperatorLabel = (op) => {
  const found = operatorOptions.find(o => o.value === op)
  return found ? found.label : op
}

const getActionTypeConfig = (type) => {
  return actionTypeOptions.find(a => a.value === type) || { label: type, color: 'default' }
}

const hasValidationErrors = computed(() => {
  const errors = []
  if (!form.name.trim()) errors.push('Rule name is required')
  if (!form.entity_type) errors.push('Entity type is required')
  if (form.trigger_on.length === 0) errors.push('At least one trigger is required')
  if (form.conditions.length === 0) errors.push('At least one condition is required')
  if (form.actions.length === 0) errors.push('At least one action is required')
  return errors
})

let conditionKeyCounter = 0
let actionKeyCounter = 0

const fetchRule = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const response = await getBusinessRuleApi(props.ruleId)
    const ruleData = response.data || response
    form.name = ruleData.name
    form.description = ruleData.description || ''
    form.entity_type = ruleData.entity_type
    form.trigger_on = ruleData.trigger_on || []
    form.priority = ruleData.priority || 100
    form.is_active = ruleData.is_active !== false
    form.conditions = (ruleData.conditions || []).map(c => ({
      _key: ++conditionKeyCounter,
      field: c.field,
      operator: c.operator,
      value: c.value,
      logical_op: c.logical_op,
      sequence: c.sequence,
    }))
    form.actions = (ruleData.actions || []).map(a => ({
      _key: ++actionKeyCounter,
      sequence: a.sequence,
      action_type: a.action_type,
      config: a.config,
      configStr: JSON.stringify(a.config || {}, null, 2),
    }))
  } catch (e) {
    message.error('Failed to load business rule')
    emit('back')
  } finally {
    loading.value = false
  }
}

const addCondition = () => {
  form.conditions.push({
    _key: ++conditionKeyCounter,
    field: '',
    operator: 'EQ',
    value: '',
    logical_op: form.conditions.length > 0 ? 'AND' : undefined,
    sequence: form.conditions.length + 1,
  })
}

const removeCondition = (index) => {
  if (form.conditions.length <= 1) {
    message.warning('At least one condition is required')
    return
  }
  form.conditions.splice(index, 1)
  form.conditions.forEach((c, i) => {
    c.sequence = i + 1
    if (i === 0) c.logical_op = undefined
  })
}

const addAction = () => {
  form.actions.push({
    _key: ++actionKeyCounter,
    sequence: form.actions.length + 1,
    action_type: 'LOG',
    config: {},
    configStr: '{}',
  })
}

const removeAction = (index) => {
  if (form.actions.length <= 1) {
    message.warning('At least one action is required')
    return
  }
  form.actions.splice(index, 1)
  form.actions.forEach((a, i) => {
    a.sequence = i + 1
  })
}

const handleSubmit = async () => {
  if (hasValidationErrors.value.length > 0) {
    message.error(hasValidationErrors.value[0])
    return
  }

  saving.value = true
  try {
    const processedActions = form.actions.map(a => {
      let config = {}
      try {
        config = JSON.parse(a.configStr || '{}')
      } catch (e) {
        config = {}
      }
      return {
        sequence: a.sequence,
        action_type: a.action_type,
        config: config,
      }
    })

    const payload = {
      name: form.name,
      description: form.description,
      entity_type: form.entity_type,
      trigger_on: form.trigger_on,
      priority: form.priority,
      is_active: form.is_active,
      conditions: form.conditions.map(c => ({
        field: c.field,
        operator: c.operator,
        value: c.value,
        logical_op: c.logical_op,
        sequence: c.sequence,
      })),
      actions: processedActions,
    }

    if (isEdit.value) {
      await updateBusinessRuleApi(props.ruleId, payload)
      message.success('Business rule updated successfully')
    } else {
      await createBusinessRuleApi(payload)
      message.success('Business rule created successfully')
    }
    emit('saved')
    emit('back')
  } catch (err) {
    message.error(err.response?.data?.error?.message || 'Failed to save business rule')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (isEdit.value) {
    fetchRule()
  } else {
    addCondition()
    addAction()
  }
})
</script>

<template>
  <div class="business-rule-form-page">
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
                <ThunderboltOutlined />
                {{ isEdit ? 'Edit Business Rule' : 'Create Business Rule' }}
              </h1>
              <p class="page-subtitle">{{ isEdit ? 'Modify business logic configuration' : 'Configure automated business logic and validations' }}</p>
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
              <Tag :color="getEntityTypeConfig(form.entity_type).color">
                {{ getEntityTypeConfig(form.entity_type).label }}
              </Tag>
            </div>

            <div class="preview-name">
              {{ form.name || 'Untitled Rule' }}
            </div>
            <div class="preview-description">
              {{ form.description || 'No description' }}
            </div>

            <!-- Triggers -->
            <div class="preview-section">
              <h4 class="section-title">Triggers</h4>
              <div class="triggers-list">
                <Tag v-for="trigger in form.trigger_on" :key="trigger" color="blue">
                  {{ trigger.replace(/_/g, ' ') }}
                </Tag>
                <span v-if="form.trigger_on.length === 0" class="empty-text">No triggers</span>
              </div>
            </div>

            <!-- Conditions Summary -->
            <div class="preview-section">
              <h4 class="section-title">
                <FilterOutlined /> Conditions ({{ form.conditions.length }})
              </h4>
              <div class="conditions-preview">
                <div v-for="(cond, i) in form.conditions.slice(0, 3)" :key="cond._key" class="condition-preview-item">
                  <span v-if="i > 0" class="logical-op">{{ cond.logical_op }}</span>
                  <code>{{ cond.field || '?' }} {{ getOperatorLabel(cond.operator) }} {{ cond.value || '?' }}</code>
                </div>
                <div v-if="form.conditions.length > 3" class="more-items">
                  +{{ form.conditions.length - 3 }} more
                </div>
              </div>
            </div>

            <!-- Actions Summary -->
            <div class="preview-section">
              <h4 class="section-title">
                <PlayCircleOutlined /> Actions ({{ form.actions.length }})
              </h4>
              <div class="actions-preview">
                <Tag v-for="action in form.actions.slice(0, 4)" :key="action._key" :color="getActionTypeConfig(action.action_type).color">
                  {{ getActionTypeConfig(action.action_type).label }}
                </Tag>
                <span v-if="form.actions.length > 4" class="more-items">+{{ form.actions.length - 4 }} more</span>
              </div>
            </div>

            <div class="preview-status">
              <Space>
                <Tag :color="form.is_active ? 'success' : 'default'">
                  {{ form.is_active ? 'Active' : 'Inactive' }}
                </Tag>
                <Tag>Priority: {{ form.priority }}</Tag>
              </Space>
            </div>
          </div>

          <!-- Quick Tips -->
          <div class="tips-card">
            <h4 class="tips-title">
              <InfoCircleOutlined /> Quick Tips
            </h4>
            <ul class="tips-list">
              <li>Lower priority numbers execute first</li>
              <li>Use <strong>AND/OR</strong> to combine conditions</li>
              <li>Actions execute in sequence order</li>
              <li>Test your rule before activating</li>
            </ul>
          </div>
        </div>

        <!-- Right Content - Form Tabs -->
        <div class="main-content">
          <Tabs v-model:activeKey="activeTab" class="form-tabs">
            <!-- Basic Info Tab -->
            <TabPane key="basic">
              <template #tab>
                <span><ThunderboltOutlined /> Basic Info</span>
              </template>

              <div class="tab-content">
                <Form layout="vertical">
                  <Row :gutter="24">
                    <Col :span="12">
                      <FormItem label="Rule Name" required>
                        <Input
                          v-model:value="form.name"
                          placeholder="e.g., High Value Order Notification"
                          size="large"
                        />
                      </FormItem>
                    </Col>
                    <Col :span="12">
                      <FormItem label="Entity Type" required>
                        <Select v-model:value="form.entity_type" size="large" :disabled="isEdit">
                          <SelectOption v-for="type in entityTypes" :key="type.value" :value="type.value">
                            <div class="entity-option">
                              <span class="entity-dot" :style="{ backgroundColor: type.color }"></span>
                              {{ type.label }}
                            </div>
                          </SelectOption>
                        </Select>
                      </FormItem>
                    </Col>
                  </Row>

                  <Row :gutter="24">
                    <Col :span="16">
                      <FormItem label="Triggers" required>
                        <Select
                          v-model:value="form.trigger_on"
                          mode="multiple"
                          placeholder="Select when this rule should run"
                          size="large"
                        >
                          <SelectOption v-for="opt in triggerOptions" :key="opt.value" :value="opt.value">
                            {{ opt.label }}
                          </SelectOption>
                        </Select>
                      </FormItem>
                    </Col>
                    <Col :span="8">
                      <FormItem label="Priority">
                        <InputNumber
                          v-model:value="form.priority"
                          :min="1"
                          :max="1000"
                          style="width: 100%"
                          size="large"
                        />
                      </FormItem>
                    </Col>
                  </Row>

                  <FormItem label="Description">
                    <Textarea
                      v-model:value="form.description"
                      placeholder="Describe what this rule does..."
                      :rows="3"
                    />
                  </FormItem>

                  <FormItem label="Status">
                    <Switch v-model:checked="form.is_active" />
                    <span class="switch-label">{{ form.is_active ? 'Active' : 'Inactive' }}</span>
                  </FormItem>
                </Form>
              </div>
            </TabPane>

            <!-- Conditions Tab -->
            <TabPane key="conditions">
              <template #tab>
                <span>
                  <FilterOutlined /> Conditions
                  <span class="tab-badge">{{ form.conditions.length }}</span>
                </span>
              </template>

              <div class="tab-content">
                <div class="tab-toolbar">
                  <div class="toolbar-info">
                    <span class="text-muted">Define when this rule should apply</span>
                  </div>
                  <Button type="primary" @click="addCondition">
                    <template #icon><PlusOutlined /></template>
                    Add Condition
                  </Button>
                </div>

                <div class="conditions-list">
                  <div
                    v-for="(cond, index) in form.conditions"
                    :key="cond._key"
                    class="condition-item"
                  >
                    <div class="condition-row">
                      <div class="logical-select" v-if="index > 0">
                        <Select v-model:value="cond.logical_op" size="small" style="width: 80px">
                          <SelectOption value="AND">AND</SelectOption>
                          <SelectOption value="OR">OR</SelectOption>
                        </Select>
                      </div>
                      <div class="condition-fields">
                        <Input
                          v-model:value="cond.field"
                          placeholder="Field name (e.g., total_amount)"
                          class="field-input"
                        />
                        <Select v-model:value="cond.operator" style="width: 180px">
                          <SelectOption v-for="op in operatorOptions" :key="op.value" :value="op.value">
                            {{ op.label }}
                          </SelectOption>
                        </Select>
                        <Input
                          v-model:value="cond.value"
                          placeholder="Value"
                          class="value-input"
                        />
                      </div>
                      <Button
                        type="text"
                        danger
                        @click="removeCondition(index)"
                        :disabled="form.conditions.length <= 1"
                      >
                        <template #icon><DeleteOutlined /></template>
                      </Button>
                    </div>
                  </div>
                </div>

                <div class="add-btn" v-if="form.conditions.length > 0">
                  <Button type="dashed" block @click="addCondition">
                    <template #icon><PlusOutlined /></template>
                    Add Another Condition
                  </Button>
                </div>
              </div>
            </TabPane>

            <!-- Actions Tab -->
            <TabPane key="actions">
              <template #tab>
                <span>
                  <PlayCircleOutlined /> Actions
                  <span class="tab-badge">{{ form.actions.length }}</span>
                </span>
              </template>

              <div class="tab-content">
                <div class="tab-toolbar">
                  <div class="toolbar-info">
                    <span class="text-muted">Define what happens when conditions are met</span>
                  </div>
                  <Button type="primary" @click="addAction">
                    <template #icon><PlusOutlined /></template>
                    Add Action
                  </Button>
                </div>

                <div class="actions-list">
                  <Card
                    v-for="(action, index) in form.actions"
                    :key="action._key"
                    size="small"
                    class="action-card"
                  >
                    <template #title>
                      <Space>
                        <span class="action-number">{{ action.sequence }}</span>
                        <Tag :color="getActionTypeConfig(action.action_type).color">
                          {{ getActionTypeConfig(action.action_type).label }}
                        </Tag>
                      </Space>
                    </template>
                    <template #extra>
                      <Button
                        type="text"
                        danger
                        size="small"
                        @click="removeAction(index)"
                        :disabled="form.actions.length <= 1"
                      >
                        <template #icon><DeleteOutlined /></template>
                      </Button>
                    </template>

                    <Row :gutter="16">
                      <Col :span="8">
                        <FormItem label="Action Type">
                          <Select v-model:value="action.action_type">
                            <SelectOption v-for="opt in actionTypeOptions" :key="opt.value" :value="opt.value">
                              <Tag :color="opt.color" size="small">{{ opt.label }}</Tag>
                            </SelectOption>
                          </Select>
                        </FormItem>
                      </Col>
                      <Col :span="16">
                        <FormItem label="Configuration (JSON)">
                          <Textarea
                            v-model:value="action.configStr"
                            placeholder='{"field": "value", "message": "..."}'
                            :rows="3"
                            class="config-textarea"
                          />
                        </FormItem>
                      </Col>
                    </Row>
                  </Card>
                </div>

                <div class="add-btn" v-if="form.actions.length > 0">
                  <Button type="dashed" block @click="addAction">
                    <template #icon><PlusOutlined /></template>
                    Add Another Action
                  </Button>
                </div>
              </div>
            </TabPane>
          </Tabs>
        </div>
      </div>
    </Spin>
  </div>
</template>

<script>
export default {
  name: 'BusinessRuleFormPage',
}
</script>
