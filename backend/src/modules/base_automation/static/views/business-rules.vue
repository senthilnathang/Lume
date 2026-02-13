<script setup>
import { ref, computed, onMounted } from 'vue'
import { Page } from '@vben/common-ui'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  List,
  message,
  Modal,
  Popconfirm,
  Result,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  DescriptionsItem,
  ListItem,
} from 'ant-design-vue'
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
  getBusinessRulesApi,
  getBusinessRuleApi,
  deleteBusinessRuleApi,
  toggleBusinessRuleApi,
  testBusinessRuleApi,
} from '#/api/base_automation'
import BusinessRuleForm from './business-rules-form.vue'

defineOptions({
  name: 'BusinessRulesList',
})

const loading = ref(false)
const testing = ref(false)
const rules = ref([])
const showViewModal = ref(false)
const showTestModal = ref(false)
const selectedRule = ref(null)
const testData = ref('{}')
const testResult = ref(null)

// Form view state
const showForm = ref(false)
const editingRuleId = ref(null)

const entityTypes = [
  { value: '', label: 'All Types' },
  { value: 'hr.leave', label: 'Leave Request' },
  { value: 'hr.expense', label: 'Expense' },
  { value: 'hr.travel', label: 'Travel Request' },
  { value: 'hr.loan', label: 'Loan' },
  { value: 'hr.overtime', label: 'Overtime' },
  { value: 'purchase.order', label: 'Purchase Order' },
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
  { value: 'SET_FIELD', label: 'Set Field' },
  { value: 'VALIDATE', label: 'Validate' },
  { value: 'REQUIRE_APPROVAL', label: 'Require Approval' },
  { value: 'SEND_EMAIL', label: 'Send Email' },
  { value: 'WEBHOOK', label: 'Webhook' },
  { value: 'LOG', label: 'Log' },
]

const filterEntityType = ref('')

const filteredRules = computed(() => {
  if (!filterEntityType.value) return rules.value
  return rules.value.filter(r => r.entity_type === filterEntityType.value)
})

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Entity Type', key: 'entity_type', width: 120 },
  { title: 'Triggers', key: 'triggers', width: 200 },
  { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 80 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Actions', key: 'actions', width: 200, fixed: 'right' },
]

const formatEntityType = (type) => {
  if (!type) return ''
  return type.replace(/\./g, ' ').toUpperCase()
}

const formatTrigger = (trigger) => {
  if (!trigger) return ''
  return trigger.replace(/_/g, ' ')
}

const fetchRules = async () => {
  loading.value = true
  try {
    const response = await getBusinessRulesApi({})
    rules.value = response.items || response.data?.items || response || []
  } catch (e) {
    message.error('Failed to load business rules')
    console.error(e)
  } finally {
    loading.value = false
  }
}

const openCreateForm = () => {
  editingRuleId.value = null
  showForm.value = true
}

const openEditForm = (rule) => {
  editingRuleId.value = rule.id
  showForm.value = true
}

const handleFormBack = () => {
  showForm.value = false
  editingRuleId.value = null
}

const handleFormSaved = () => {
  fetchRules()
}

const viewRule = async (rule) => {
  try {
    const detail = await getBusinessRuleApi(rule.id)
    selectedRule.value = detail.data || detail
  } catch (e) {
    selectedRule.value = rule
  }
  showViewModal.value = true
}

const openTestModal = (rule) => {
  selectedRule.value = rule
  testData.value = JSON.stringify({ total_amount: 50000, status: 'DRAFT' }, null, 2)
  testResult.value = null
  showTestModal.value = true
}

const toggleRule = async (rule) => {
  try {
    await toggleBusinessRuleApi(rule.id)
    message.success(rule.is_active ? 'Rule deactivated successfully' : 'Rule activated successfully')
    await fetchRules()
  } catch (e) {
    message.error('Failed to update rule status')
  }
}

const deleteRule = (rule) => {
  Modal.confirm({
    title: 'Delete Business Rule',
    content: 'Are you sure you want to delete "' + rule.name + '"? This cannot be undone.',
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    async onOk() {
      try {
        await deleteBusinessRuleApi(rule.id)
        message.success('Business rule deleted successfully')
        await fetchRules()
      } catch (e) {
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
    const response = await testBusinessRuleApi(selectedRule.value.id, { test_data: data })
    testResult.value = response.data || response
  } catch (e) {
    if (e.name === 'SyntaxError') {
      message.error('Invalid JSON in test data')
    } else {
      message.error('Failed to test rule')
    }
  } finally {
    testing.value = false
  }
}

const getOperatorLabel = (op) => {
  const found = operatorOptions.find(o => o.value === op)
  return found ? found.label : op
}

const getActionTypeLabel = (type) => {
  const found = actionTypeOptions.find(a => a.value === type)
  return found ? found.label : type
}

onMounted(() => {
  fetchRules()
})
</script>

<template>
  <!-- Show Form View when creating/editing -->
  <BusinessRuleForm
    v-if="showForm"
    :rule-id="editingRuleId"
    @back="handleFormBack"
    @saved="handleFormSaved"
  />

  <!-- Show List View -->
  <Page v-else auto-content-height>
    <div class="p-4">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Business Rules</h1>
          <p class="text-gray-500">Configure automated business logic and validations</p>
        </div>
        <Space>
          <Select
            v-model:value="filterEntityType"
            style="width: 200px"
            placeholder="Filter by entity type"
            :options="entityTypes"
          />
          <Button @click="fetchRules">
            <template #icon><ReloadOutlined /></template>
          </Button>
          <Button type="primary" @click="openCreateForm">
            <template #icon><PlusOutlined /></template>
            Create Rule
          </Button>
        </Space>
      </div>

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
              <Tag>{{ formatEntityType(record.entity_type) }}</Tag>
            </template>

            <template v-else-if="column.key === 'triggers'">
              <Tag
                v-for="trigger in (record.trigger_on || [])"
                :key="trigger"
                color="blue"
                style="margin: 2px"
              >
                {{ formatTrigger(trigger) }}
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
                  <Button type="text" size="small" @click="viewRule(record)">
                    <template #icon><EyeOutlined /></template>
                  </Button>
                </Tooltip>
                <Tooltip title="Test Rule">
                  <Button type="text" size="small" @click="openTestModal(record)">
                    <template #icon><ExperimentOutlined /></template>
                  </Button>
                </Tooltip>
                <Tooltip title="Edit">
                  <Button type="text" size="small" @click="openEditForm(record)">
                    <template #icon><EditOutlined /></template>
                  </Button>
                </Tooltip>
                <Tooltip :title="record.is_active ? 'Deactivate' : 'Activate'">
                  <Button type="text" size="small" @click="toggleRule(record)">
                    <template #icon>
                      <PauseCircleOutlined v-if="record.is_active" />
                      <PlayCircleOutlined v-else />
                    </template>
                  </Button>
                </Tooltip>
                <Tooltip title="Delete">
                  <Button type="text" size="small" danger @click="deleteRule(record)">
                    <template #icon><DeleteOutlined /></template>
                  </Button>
                </Tooltip>
              </Space>
            </template>
          </template>

        </Table>

        <!-- Empty State -->
        <div v-if="!loading && rules.length === 0" class="py-8 text-center">
          <ExperimentOutlined style="font-size: 48px; color: #d9d9d9" />
          <p class="mt-4 text-gray-500">No business rules found</p>
          <Button type="primary" class="mt-4" @click="openCreateForm">
            Create Rule
          </Button>
        </div>
      </Card>

      <!-- View Rule Modal -->
      <Modal v-model:open="showViewModal" :title="selectedRule ? selectedRule.name : 'Rule Details'" width="700px" :footer="null">
        <div v-if="selectedRule">
          <Descriptions :column="2" bordered size="small" style="margin-bottom: 16px">
            <DescriptionsItem label="Entity Type">
              <Tag>{{ selectedRule.entity_type }}</Tag>
            </DescriptionsItem>
            <DescriptionsItem label="Priority">{{ selectedRule.priority }}</DescriptionsItem>
            <DescriptionsItem label="Triggers" :span="2">
              <Tag v-for="t in (selectedRule.trigger_on || [])" :key="t" color="blue" style="margin-right: 4px">{{ t }}</Tag>
            </DescriptionsItem>
            <DescriptionsItem label="Status">
              <Tag :color="selectedRule.is_active ? 'green' : 'default'">
                {{ selectedRule.is_active ? 'Active' : 'Inactive' }}
              </Tag>
            </DescriptionsItem>
          </Descriptions>

          <Divider orientation="left">Conditions</Divider>
          <div v-for="(cond, i) in (selectedRule.conditions || [])" :key="'view-cond-' + i" class="condition-display">
            <span v-if="i > 0" class="logical-op">{{ cond.logical_op }}</span>
            <code>{{ cond.field }} {{ getOperatorLabel(cond.operator) }} {{ cond.value }}</code>
          </div>

          <Divider orientation="left">Actions</Divider>
          <List :data-source="selectedRule.actions || []" size="small">
            <template #renderItem="{ item }">
              <ListItem>
                <AListItemMeta>
                  <template #title>
                    <Tag color="purple">{{ getActionTypeLabel(item.action_type) }}</Tag>
                  </template>
                  <template #description>
                    <code>{{ JSON.stringify(item.config) }}</code>
                  </template>
                </AListItemMeta>
              </ListItem>
            </template>
          </List>
        </div>
      </Modal>

      <!-- Test Rule Modal -->
      <Modal v-model:open="showTestModal" title="Test Rule" width="600px" :footer="null">
        <div v-if="selectedRule">
          <Alert :message="'Testing: ' + selectedRule.name" type="info" show-icon style="margin-bottom: 16px" />

          <div style="margin-bottom: 16px">
            <label style="display: block; margin-bottom: 8px; font-weight: 500">Test Data (JSON)</label>
            <textarea
              v-model="testData"
              rows="6"
              placeholder='{"total_amount": 50000}'
              style="width: 100%; font-family: monospace; padding: 8px; border: 1px solid #d9d9d9; border-radius: 4px"
            />
          </div>

          <Button type="primary" @click="runTest" :loading="testing" block>
            <template #icon><ThunderboltOutlined /></template>
            Run Test
          </Button>

          <div v-if="testResult" style="margin-top: 16px">
            <Divider>Test Results</Divider>
            <Result
              :status="testResult.matched ? 'success' : 'warning'"
              :title="testResult.matched ? 'Rule Matched' : 'Rule Did Not Match'"
            >
              <template #extra>
                <div v-if="testResult.matched">
                  <p><strong>Actions that would execute:</strong></p>
                  <Tag v-for="action in (testResult.actions_would_execute || [])" :key="action" color="green" style="margin-bottom: 4px">
                    {{ action }}
                  </Tag>
                </div>
                <div v-if="testResult.validation_errors && testResult.validation_errors.length > 0">
                  <p style="color: #ff4d4f"><strong>Validation Errors:</strong></p>
                  <Tag v-for="err in testResult.validation_errors" :key="err" color="red" style="margin-bottom: 4px">
                    {{ err }}
                  </Tag>
                </div>
              </template>
            </Result>
          </div>
        </div>
      </Modal>
    </div>
  </Page>
</template>

<style scoped>
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
</style>
