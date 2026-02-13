<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue'
import {
  rulesApi,
  type BusinessRule,
  type ConditionOperator,
  type RuleActionType,
  type RuleTriggerType,
  type LogicalOperator,
} from '#/api/rules'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  DescriptionsItem,
  Divider,
  Form,
  FormItem,
  Input,
  InputNumber,
  List,
  ListItem,
  ListItemMeta,
  message,
  Modal,
  PageHeader,
  Result,
  Row,
  Select,
  SelectOption,
  Space,
  Table,
  Tag,
  Textarea,
  Tooltip,
} from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const rules = ref<BusinessRule[]>([])
const showModal = ref(false)
const showViewModal = ref(false)
const showTestModal = ref(false)
const isEditing = ref(false)
const editingRuleId = ref<string | null>(null)
const selectedRule = ref<BusinessRule | null>(null)
const testData = ref('{}')
const testResult = ref<any>(null)
const formRef = ref<FormInstance>()

const entityTypes = [
  { value: '', label: 'All Types' },
  { value: 'sales_order', label: 'Sales Order' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'party', label: 'Party' },
  { value: 'product', label: 'Product' },
]

const triggerOptions: { value: RuleTriggerType; label: string }[] = [
  { value: 'before_create', label: 'Before Create' },
  { value: 'after_create', label: 'After Create' },
  { value: 'before_update', label: 'Before Update' },
  { value: 'after_update', label: 'After Update' },
  { value: 'before_delete', label: 'Before Delete' },
  { value: 'after_delete', label: 'After Delete' },
  { value: 'on_status_change', label: 'On Status Change' },
  { value: 'before_status_change', label: 'Before Status Change' },
  { value: 'on_approval', label: 'On Approval' },
  { value: 'on_rejection', label: 'On Rejection' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'manual', label: 'Manual' },
]

const operatorOptions: { value: ConditionOperator; label: string }[] = [
  { value: 'eq', label: 'Equals (=)' },
  { value: 'ne', label: 'Not Equals (!=)' },
  { value: 'gt', label: 'Greater Than (>)' },
  { value: 'lt', label: 'Less Than (<)' },
  { value: 'gte', label: 'Greater or Equal (>=)' },
  { value: 'lte', label: 'Less or Equal (<=)' },
  { value: 'in', label: 'In List' },
  { value: 'not_in', label: 'Not In List' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'is_null', label: 'Is Null' },
  { value: 'is_not_null', label: 'Is Not Null' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
  { value: 'changed', label: 'Changed' },
  { value: 'changed_to', label: 'Changed To' },
  { value: 'changed_from', label: 'Changed From' },
]

const actionTypeOptions: { value: RuleActionType; label: string; description: string }[] = [
  { value: 'set_field', label: 'Set Field', description: 'Set a field value' },
  { value: 'validate', label: 'Validate', description: 'Add validation error' },
  { value: 'block', label: 'Block', description: 'Block the operation' },
  { value: 'require_approval', label: 'Require Approval', description: 'Trigger approval workflow' },
  { value: 'send_notification', label: 'Send Notification', description: 'Send in-app notification' },
  { value: 'send_email', label: 'Send Email', description: 'Send email notification' },
  { value: 'send_sms', label: 'Send SMS', description: 'Send SMS notification' },
  { value: 'create_task', label: 'Create Task', description: 'Create a task' },
  { value: 'webhook', label: 'Webhook', description: 'Call external API' },
  { value: 'trigger_workflow', label: 'Trigger Workflow', description: 'Trigger a workflow' },
  { value: 'log', label: 'Log', description: 'Log message to audit' },
  { value: 'execute_code', label: 'Execute Code', description: 'Run custom code' },
  { value: 'create_record', label: 'Create Record', description: 'Create a new record' },
]

const filterEntityType = ref('')

const filteredRules = computed(() => {
  if (!filterEntityType.value) return rules.value
  return rules.value.filter(r => r.entity_type === filterEntityType.value)
})

interface FormCondition {
  field: string
  operator: ConditionOperator
  value: string
  value_type: string
}

interface FormAction {
  type: RuleActionType
  target_field?: string
  value?: string
  message?: string
  configStr: string  // For JSON editor
}

const formState = reactive({
  name: '',
  code: '',
  description: '',
  entity_type: 'sales_order',
  trigger_type: 'after_create' as RuleTriggerType,
  condition_logic: 'and' as LogicalOperator,
  priority: 10,
  stop_on_match: false,
  conditions: [] as FormCondition[],
  actions: [] as FormAction[],
})

const formRules = {
  name: [{ required: true, message: 'Rule name is required' }],
  code: [
    { required: true, message: 'Rule code is required' },
    { pattern: /^[a-z][a-z0-9_]*$/, message: 'Code must start with letter, contain only lowercase, numbers, underscores' }
  ],
  entity_type: [{ required: true, message: 'Entity type is required' }],
  trigger_type: [{ required: true, message: 'Trigger type is required' }],
}

const fetchRules = async () => {
  loading.value = true
  try {
    const response = await rulesApi.getAll()
    rules.value = (response as any).items || (response as any).data?.items || response || []
  } catch {
    message.error('Failed to load business rules')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  formState.name = ''
  formState.code = ''
  formState.description = ''
  formState.entity_type = 'sales_order'
  formState.trigger_type = 'after_create'
  formState.condition_logic = 'and'
  formState.priority = 10
  formState.stop_on_match = false
  formState.conditions = []
  formState.actions = []
}

const openCreateModal = () => {
  isEditing.value = false
  editingRuleId.value = null
  resetForm()
  addCondition()
  addAction()
  showModal.value = true
}

const openEditModal = (rule: BusinessRule) => {
  isEditing.value = true
  editingRuleId.value = String(rule.id)
  formState.name = rule.name
  formState.code = rule.code
  formState.description = rule.description || ''
  formState.entity_type = rule.entity_type
  formState.trigger_type = rule.trigger_type
  formState.condition_logic = rule.condition_logic || 'and'
  formState.priority = rule.priority
  formState.stop_on_match = rule.stop_on_match || false
  formState.conditions = (rule.conditions || []).map(c => ({
    field: c.field,
    operator: c.operator,
    value: String(c.value || ''),
    value_type: c.value_type || 'static',
  }))
  formState.actions = (rule.actions || []).map(a => ({
    type: a.type,
    target_field: a.target_field,
    value: a.value != null ? String(a.value) : undefined,
    message: a.message,
    configStr: JSON.stringify(a || {}, null, 2),
  }))
  showModal.value = true
}

const viewRule = (rule: BusinessRule) => {
  selectedRule.value = rule
  showViewModal.value = true
}

const openTestModal = (rule: BusinessRule) => {
  selectedRule.value = rule
  testData.value = JSON.stringify({ total_amount: 50000, status: 'DRAFT' }, null, 2)
  testResult.value = null
  showTestModal.value = true
}

const addCondition = () => {
  formState.conditions.push({
    field: '',
    operator: 'eq',
    value: '',
    value_type: 'static',
  })
}

const removeCondition = (index: number) => {
  formState.conditions.splice(index, 1)
}

const addAction = () => {
  formState.actions.push({
    type: 'log',
    configStr: '{"message": "Rule triggered"}',
  })
}

const removeAction = (index: number) => {
  formState.actions.splice(index, 1)
}

const handleSave = async () => {
  try {
    await formRef.value?.validate()

    if (formState.conditions.length === 0) {
      message.error('At least one condition is required')
      return
    }

    if (formState.actions.length === 0) {
      message.error('At least one action is required')
      return
    }

    saving.value = true

    // Process conditions
    const processedConditions = formState.conditions.map(c => ({
      field: c.field,
      operator: c.operator,
      value: c.value,
      value_type: c.value_type || 'static',
    }))

    // Process actions - parse from JSON config
    const processedActions = formState.actions.map(a => {
      try {
        return JSON.parse(a.configStr || '{}')
      } catch {
        return { type: a.type, message: 'Rule triggered' }
      }
    })

    if (isEditing.value && editingRuleId.value) {
      await rulesApi.update(editingRuleId.value, {
        name: formState.name,
        description: formState.description,
        trigger_type: formState.trigger_type,
        condition_logic: formState.condition_logic,
        priority: formState.priority,
        stop_on_match: formState.stop_on_match,
        conditions: processedConditions,
        actions: processedActions,
      })
      message.success('Business rule updated successfully')
    } else {
      await rulesApi.create({
        name: formState.name,
        code: formState.code,
        description: formState.description,
        entity_type: formState.entity_type,
        trigger_type: formState.trigger_type,
        condition_logic: formState.condition_logic,
        priority: formState.priority,
        stop_on_match: formState.stop_on_match,
        conditions: processedConditions,
        actions: processedActions,
      })
      message.success('Business rule created successfully')
    }

    showModal.value = false
    await fetchRules()
  } catch (error: any) {
    if (error.response?.data?.error?.message) {
      message.error(error.response.data.error.message)
    } else if (error.response?.data?.detail) {
      message.error(error.response.data.detail)
    } else if (!error.errorFields) {
      message.error('Failed to save business rule')
    }
  } finally {
    saving.value = false
  }
}

const toggleRule = async (rule: BusinessRule) => {
  try {
    await rulesApi.toggle(String(rule.id))
    message.success(`Rule ${rule.is_active ? 'deactivated' : 'activated'} successfully`)
    await fetchRules()
  } catch {
    message.error('Failed to update rule status')
  }
}

const deleteRule = (rule: BusinessRule) => {
  Modal.confirm({
    title: 'Delete Business Rule',
    content: `Are you sure you want to delete "${rule.name}"? This cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    async onOk() {
      try {
        await rulesApi.delete(String(rule.id))
        message.success('Business rule deleted successfully')
        await fetchRules()
      } catch {
        message.error('Failed to delete rule')
      }
    },
  })
}

const runTest = async () => {
  if (!selectedRule.value) return

  try {
    testing.value = true
    const data = JSON.parse(testData.value)
    const response = await rulesApi.test(String(selectedRule.value.id), { entity_data: data })
    testResult.value = response || (response as any).data
  } catch (e: any) {
    if (e.name === 'SyntaxError') {
      message.error('Invalid JSON in test data')
    } else {
      message.error('Failed to test rule')
    }
  } finally {
    testing.value = false
  }
}

const getOperatorLabel = (op: ConditionOperator | string) => {
  return operatorOptions.find(o => o.value === op)?.label || op.replace('_', ' ')
}

const getActionTypeLabel = (type: RuleActionType | string) => {
  return actionTypeOptions.find(a => a.value === type)?.label || type.replace('_', ' ')
}

const getTriggerLabel = (trigger: RuleTriggerType | string) => {
  return triggerOptions.find(t => t.value === trigger)?.label || trigger.replace('_', ' ')
}

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Entity Type', key: 'entity_type', width: 120 },
  { title: 'Triggers', key: 'triggers', width: 200 },
  { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 80 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Actions', key: 'actions', width: 200, fixed: 'right' as const },
]

onMounted(() => {
  fetchRules()
})
</script>

<template>
  <div class="rules-page">
    <PageHeader
      title="Business Rules"
      sub-title="Configure automated business logic and validations"
    >
      <template #extra>
        <Select
          v-model:value="filterEntityType"
          style="width: 200px; margin-right: 16px"
          placeholder="Filter by entity type"
        >
          <SelectOption v-for="type in entityTypes" :key="type.value" :value="type.value">
            {{ type.label }}
          </SelectOption>
        </Select>
        <Button @click="fetchRules" style="margin-right: 8px">
          <template #icon><ReloadOutlined /></template>
        </Button>
        <Button type="primary" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          Create Rule
        </Button>
      </template>
    </PageHeader>

    <Card>
      <Table
        :columns="columns"
        :data-source="filteredRules"
        :loading="loading"
        :pagination="{ pageSize: 20 }"
        :scroll="{ x: 900 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'entity_type'">
            <Tag>{{ record.entity_type.replace('_', ' ').toUpperCase() }}</Tag>
          </template>

          <template v-else-if="column.key === 'triggers'">
            <Tag color="blue">
              {{ getTriggerLabel(record.trigger_type) }}
            </Tag>
          </template>

          <template v-else-if="column.key === 'status'">
            <Tag :color="record.is_active ? 'green' : 'default'">
              {{ record.is_active ? 'Active' : 'Inactive' }}
            </Tag>
          </template>

          <template v-else-if="column.key === 'actions'">
            <Space>
              <Tooltip title="View Details">
                <Button type="text" size="small" @click="viewRule(record as any)">
                  <template #icon><EyeOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip title="Test Rule">
                <Button type="text" size="small" @click="openTestModal(record as any)">
                  <template #icon><ExperimentOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip title="Edit">
                <Button type="text" size="small" @click="openEditModal(record as any)">
                  <template #icon><EditOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip :title="record.is_active ? 'Deactivate' : 'Activate'">
                <Button type="text" size="small" @click="toggleRule(record as any)">
                  <template #icon>
                    <PauseCircleOutlined v-if="record.is_active" />
                    <PlayCircleOutlined v-else />
                  </template>
                </Button>
              </Tooltip>
              <Tooltip title="Delete">
                <Button type="text" size="small" danger @click="deleteRule(record as any)">
                  <template #icon><DeleteOutlined /></template>
                </Button>
              </Tooltip>
            </Space>
          </template>
        </template>

        <template #emptyText>
          <div class="py-8 text-center">
            <ExperimentOutlined style="font-size: 48px; color: #d9d9d9" />
            <p class="mt-4 text-gray-500">No business rules found</p>
            <Button type="primary" class="mt-4" @click="openCreateModal">
              Create Rule
            </Button>
          </div>
        </template>
      </Table>
    </Card>

    <!-- Create/Edit Modal -->
    <Modal
      v-model:open="showModal"
      :title="isEditing ? 'Edit Business Rule' : 'Create Business Rule'"
      width="900px"
      :confirmLoading="saving"
      @ok="handleSave"
      @cancel="showModal = false"
    >
      <Form ref="formRef" :model="formState" :rules="formRules" layout="vertical" class="modal-form">
        <Row :gutter="16">
          <Col :span="12">
            <FormItem label="Rule Name" name="name">
              <Input v-model:value="formState.name" placeholder="e.g., High Value Order Notification" />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="Rule Code" name="code">
              <Input v-model:value="formState.code" placeholder="e.g., high_value_order_notify" :disabled="isEditing" />
              <div class="text-gray-400 text-xs mt-1">Lowercase letters, numbers, underscores only</div>
            </FormItem>
          </Col>
        </Row>

        <Row :gutter="16">
          <Col :span="12">
            <FormItem label="Entity Type" name="entity_type">
              <Select v-model:value="formState.entity_type" :disabled="isEditing">
                <SelectOption v-for="type in entityTypes.filter(t => t.value)" :key="type.value" :value="type.value">
                  {{ type.label }}
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="Trigger Type" name="trigger_type">
              <Select v-model:value="formState.trigger_type" placeholder="Select trigger">
                <SelectOption v-for="opt in triggerOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
        </Row>

        <Row :gutter="16">
          <Col :span="8">
            <FormItem label="Condition Logic">
              <Select v-model:value="formState.condition_logic">
                <SelectOption value="and">AND - All conditions must match</SelectOption>
                <SelectOption value="or">OR - Any condition matches</SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="8">
            <FormItem label="Priority" name="priority">
              <InputNumber v-model:value="formState.priority" :min="0" :max="1000" style="width: 100%" />
            </FormItem>
          </Col>
          <Col :span="8">
            <FormItem label="Stop on Match">
              <Select v-model:value="(formState as any).stop_on_match">
                <SelectOption :value="(false as any)">No - Continue checking rules</SelectOption>
                <SelectOption :value="(true as any)">Yes - Stop after match</SelectOption>
              </Select>
            </FormItem>
          </Col>
        </Row>

        <FormItem label="Description" name="description">
          <Textarea v-model:value="formState.description" placeholder="Describe what this rule does" :rows="2" />
        </FormItem>

        <!-- Conditions -->
        <Divider orientation="left">Conditions (When) - Combined with {{ formState.condition_logic.toUpperCase() }}</Divider>
        <div v-for="(cond, index) in formState.conditions" :key="'cond-' + index" class="condition-row">
          <Row :gutter="8" align="middle">
            <Col :span="8">
              <Input v-model:value="cond.field" placeholder="Field (e.g., total_amount)" size="small" />
            </Col>
            <Col :span="6">
              <Select v-model:value="cond.operator" size="small" style="width: 100%">
                <SelectOption v-for="op in operatorOptions" :key="op.value" :value="op.value">
                  {{ op.label }}
                </SelectOption>
              </Select>
            </Col>
            <Col :span="8">
              <Input v-model:value="cond.value" placeholder="Value" size="small" />
            </Col>
            <Col :span="2">
              <Button type="text" danger size="small" @click="removeCondition(index)" :disabled="formState.conditions.length <= 1">
                <template #icon><DeleteOutlined /></template>
              </Button>
            </Col>
          </Row>
        </div>
        <Button type="dashed" size="small" @click="addCondition" class="mt-2">
          <template #icon><PlusOutlined /></template>
          Add Condition
        </Button>

        <!-- Actions -->
        <Divider orientation="left">Actions (Then)</Divider>
        <div v-for="(action, index) in formState.actions" :key="'action-' + index" class="action-row">
          <Card size="small" class="mb-2">
            <template #title>
              <span>Action {{ index + 1 }}</span>
            </template>
            <template #extra>
              <Button type="text" danger size="small" @click="removeAction(index)" :disabled="formState.actions.length <= 1">
                <template #icon><DeleteOutlined /></template>
              </Button>
            </template>
            <Row :gutter="16">
              <Col :span="8">
                <FormItem label="Type">
                  <Select v-model:value="action.type" size="small">
                    <SelectOption v-for="opt in actionTypeOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </SelectOption>
                  </Select>
                </FormItem>
              </Col>
              <Col :span="16">
                <FormItem label="Configuration (JSON)">
                  <Textarea
                    v-model:value="action.configStr"
                    placeholder='{"type": "log", "message": "Rule triggered"}'
                    :rows="3"
                    size="small"
                  />
                  <div class="text-gray-400 text-xs mt-1">Full action config as JSON (include "type" field)</div>
                </FormItem>
              </Col>
            </Row>
          </Card>
        </div>
        <Button type="dashed" size="small" @click="addAction" class="mt-2">
          <template #icon><PlusOutlined /></template>
          Add Action
        </Button>
      </Form>
    </Modal>

    <!-- View Rule Modal -->
    <Modal v-model:open="showViewModal" :title="selectedRule?.name" width="700px" :footer="null">
      <div v-if="selectedRule">
        <Descriptions :column="2" bordered size="small" class="mb-4">
          <DescriptionsItem label="Code">
            <code>{{ selectedRule.code }}</code>
          </DescriptionsItem>
          <DescriptionsItem label="Entity Type">
            <Tag>{{ selectedRule.entity_type }}</Tag>
          </DescriptionsItem>
          <DescriptionsItem label="Trigger">
            <Tag color="blue">{{ getTriggerLabel(selectedRule.trigger_type) }}</Tag>
          </DescriptionsItem>
          <DescriptionsItem label="Priority">{{ selectedRule.priority }}</DescriptionsItem>
          <DescriptionsItem label="Condition Logic">
            <Tag>{{ selectedRule.condition_logic?.toUpperCase() || 'AND' }}</Tag>
          </DescriptionsItem>
          <DescriptionsItem label="Status">
            <Tag :color="selectedRule.is_active ? 'green' : 'default'">
              {{ selectedRule.is_active ? 'Active' : 'Inactive' }}
            </Tag>
          </DescriptionsItem>
        </Descriptions>

        <Divider orientation="left">Conditions ({{ selectedRule.condition_logic?.toUpperCase() || 'AND' }})</Divider>
        <div v-for="(cond, i) in selectedRule.conditions" :key="'view-cond-' + i" class="condition-display">
          <span v-if="i > 0" class="logical-op">{{ selectedRule.condition_logic?.toUpperCase() || 'AND' }}</span>
          <code>{{ cond.field }} {{ getOperatorLabel(cond.operator) }} {{ cond.value }}</code>
        </div>

        <Divider orientation="left">Actions</Divider>
        <List :data-source="selectedRule.actions" size="small">
          <template #renderItem="{ item }">
            <ListItem>
              <ListItemMeta>
                <template #title>
                  <Tag color="purple">{{ getActionTypeLabel(item.type) }}</Tag>
                </template>
                <template #description>
                  <code>{{ JSON.stringify(item) }}</code>
                </template>
              </ListItemMeta>
            </ListItem>
          </template>
        </List>
      </div>
    </Modal>

    <!-- Test Rule Modal -->
    <Modal v-model:open="showTestModal" title="Test Rule" width="600px" :footer="null">
      <div v-if="selectedRule">
        <Alert :message="`Testing: ${selectedRule.name}`" type="info" show-icon class="mb-4" />

        <FormItem label="Test Data (JSON)">
          <Textarea v-model:value="testData" :rows="6" placeholder='{"total_amount": 50000}' />
        </FormItem>

        <Button type="primary" @click="runTest" :loading="testing" block>
          <template #icon><ThunderboltOutlined /></template>
          Run Test
        </Button>

        <div v-if="testResult" class="mt-4">
          <Divider>Test Results</Divider>
          <Result
            :status="testResult.conditions_matched ? 'success' : 'warning'"
            :title="testResult.conditions_matched ? 'Rule Matched' : 'Rule Did Not Match'"
          >
            <template #extra>
              <div v-if="testResult.condition_results?.length" class="mb-4">
                <p><strong>Condition Results:</strong></p>
                <div v-for="cr in testResult.condition_results" :key="cr.condition_index" class="mb-1">
                  <Tag :color="cr.result ? 'green' : 'red'">
                    {{ cr.field }} {{ cr.operator }} {{ cr.expected_value }} = {{ cr.result ? 'PASS' : 'FAIL' }}
                  </Tag>
                </div>
              </div>
              <div v-if="testResult.conditions_matched && testResult.action_results?.length">
                <p><strong>Actions that would execute:</strong></p>
                <Tag v-for="ar in testResult.action_results" :key="ar.action_index" :color="ar.would_execute ? 'green' : 'default'" class="mb-1">
                  {{ ar.action_type }}
                </Tag>
              </div>
              <div v-if="testResult.errors?.length">
                <p class="text-danger"><strong>Errors:</strong></p>
                <Tag v-for="(err, i) in testResult.errors" :key="i" color="red" class="mb-1">
                  {{ err }}
                </Tag>
              </div>
            </template>
          </Result>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script lang="ts">
export default {
  name: 'BusinessRulesList',
}
</script>

<style scoped>
.rules-page {
  padding: 0;
}

.modal-form {
  max-height: 70vh;
  overflow-y: auto;
}

.condition-row {
  margin-bottom: 8px;
}

.action-row {
  margin-bottom: 8px;
}

.mb-1 {
  margin-bottom: 4px;
}

.mb-2 {
  margin-bottom: 8px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-2 {
  margin-top: 8px;
}

.mt-4 {
  margin-top: 16px;
}

.mr-1 {
  margin-right: 4px;
}

.py-8 {
  padding-top: 32px;
  padding-bottom: 32px;
}

.text-center {
  text-align: center;
}

.text-gray-500 {
  color: #6b7280;
}

.text-gray-400 {
  color: #9ca3af;
}

.text-xs {
  font-size: 0.75rem;
}

.condition-display {
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 4px;
}

.logical-op {
  font-weight: bold;
  color: #1890ff;
  margin-right: 8px;
}

.text-danger {
  color: #ff4d4f;
}
</style>
