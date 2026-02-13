<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  EyeOutlined,
  TeamOutlined,
  // UserOutlined,
} from '@ant-design/icons-vue'
import {
  Button,
  Card,
  Table,
  Tag,
  Badge,
  Tooltip,
  Modal,
  Form,
  FormItem,
  Row,
  Col,
  Input,
  Textarea,
  Select,
  SelectOption,
  Divider,
  Checkbox,
  InputNumber,
  Descriptions,
  DescriptionsItem,
  Timeline,
  TimelineItem,
  PageHeader,
  Space,
  message,
} from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import { getApprovalChainsApi, createApprovalChainApi, updateApprovalChainApi, deleteApprovalChainApi } from '#/api/base'
// import { useCompanyStore } from '#/store'

// Types now use lowercase to match backend
// type ChainType = 'sequential' | 'parallel' | 'any_one'
// type ApproverType = 'user' | 'role' | 'manager' | 'department_head' | 'dynamic' | 'group'

interface ApprovalStep {
  id?: string
  step_order: number
  name: string
  approver_type: string
  approver_id?: string
  approver_role?: string
  approver_field?: string
  sla_hours: number
  can_delegate?: boolean
  can_reassign?: boolean
}

interface ApprovalChain {
  id: string
  name: string
  code?: string
  description?: string
  entity_type?: string
  chain_type: string
  is_active: boolean
  steps: ApprovalStep[]
}

// const companyStore = useCompanyStore()

const loading = ref(false)
const saving = ref(false)
const chains = ref<ApprovalChain[]>([])
const showModal = ref(false)
const showViewModal = ref(false)
const isEditing = ref(false)
const editingChainId = ref<string | null>(null)
const selectedChain = ref<ApprovalChain | null>(null)
const formRef = ref<FormInstance>()

// Backend expects lowercase values
const chainTypeOptions = [
  { value: 'sequential', label: 'Sequential', description: 'Approvers review one after another' },
  { value: 'parallel', label: 'Parallel', description: 'All approvers review at the same time' },
  { value: 'any_one', label: 'Any One', description: 'First approver to respond decides' },
]

const approverTypeOptions = [
  { value: 'user', label: 'Specific User' },
  { value: 'role', label: 'Role' },
  { value: 'manager', label: 'Reporting Manager' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'dynamic', label: 'Dynamic (Field-based)' },
  { value: 'group', label: 'Group' },
]

// Entity types for approval chains
const entityTypeOptions = [
  { value: 'sales_order', label: 'Sales Order' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'leave_request', label: 'Leave Request' },
  { value: 'expense', label: 'Expense' },
]

// Counter for generating unique step keys
let stepKeyCounter = 0

const formState = reactive({
  name: '',
  code: '',
  description: '',
  entity_type: '',
  chain_type: 'sequential' as string,  // Backend expects lowercase
  steps: [] as {
    _key: number
    step_order: number
    name: string
    approver_type: string  // Backend expects lowercase
    approver_id?: string
    approver_role?: string
    sla_hours: number
    can_delegate: boolean
    can_reassign: boolean
  }[],
})

const rules = {
  name: [{ required: true, message: 'Chain name is required' }],
  code: [{ required: true, message: 'Chain code is required' }],
  entity_type: [{ required: true, message: 'Entity type is required' }],
  chain_type: [{ required: true, message: 'Chain type is required' }],
}

const fetchChains = async () => {
  loading.value = true
  try {
    const response = await getApprovalChainsApi({})
    chains.value = (response as any).items || (response as any).data?.items || response || []
  } catch {
    message.error('Failed to load approval chains')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  formState.name = ''
  formState.code = ''
  formState.description = ''
  formState.entity_type = ''
  formState.chain_type = 'sequential'
  formState.steps = []
}

const openCreateModal = () => {
  isEditing.value = false
  editingChainId.value = null
  resetForm()
  addStep()
  showModal.value = true
}

const openEditModal = (chain: ApprovalChain) => {
  isEditing.value = true
  editingChainId.value = chain.id
  formState.name = chain.name
  formState.code = (chain as any).code || ''
  formState.description = chain.description || ''
  formState.entity_type = (chain as any).entity_type || ''
  // Ensure lowercase for chain_type
  formState.chain_type = chain.chain_type?.toLowerCase() || 'sequential'
  formState.steps = (chain.steps || []).map((s: any) => ({
    _key: ++stepKeyCounter,
    step_order: s.step_order || s.sequence || 1,
    name: s.name,
    // Ensure lowercase for approver_type
    approver_type: s.approver_type?.toLowerCase() || 'user',
    approver_id: s.approver_id,
    approver_role: s.approver_role || s.approver_field,
    sla_hours: s.sla_hours || 24,
    can_delegate: s.can_delegate ?? true,
    can_reassign: s.can_reassign ?? false,
  }))
  showModal.value = true
}

const viewChain = (chain: ApprovalChain) => {
  selectedChain.value = chain
  showViewModal.value = true
}

const addStep = () => {
  formState.steps.push({
    _key: ++stepKeyCounter,
    step_order: formState.steps.length + 1,
    name: `Step ${formState.steps.length + 1}`,
    approver_type: 'user',  // Backend expects lowercase
    sla_hours: 24,
    can_delegate: true,
    can_reassign: false,
  })
}

const removeStep = (index: number) => {
  formState.steps.splice(index, 1)
  formState.steps.forEach((s, i) => s.step_order = i + 1)
}

const handleSave = async () => {
  try {
    await formRef.value?.validate()

    if (formState.steps.length === 0) {
      message.error('At least one approval step is required')
      return
    }

    saving.value = true

    if (isEditing.value && editingChainId.value) {
      await updateApprovalChainApi(editingChainId.value as any, {
        name: formState.name,
        description: formState.description,
        chain_type: formState.chain_type as any,
      })
      message.success('Approval chain updated successfully')
    } else {
      // Transform steps to backend format - ensure lowercase for enum values
      const stepsData = formState.steps.map(s => ({
        step_order: s.step_order,
        name: s.name,
        approver_type: (s.approver_type || 'user').toLowerCase(),
        approver_field: s.approver_role || undefined,
        sla_hours: s.sla_hours,
        allow_self_approval: false,
        auto_approve_on_timeout: false,
        is_active: true,
      }))

      await createApprovalChainApi({
        name: formState.name,
        code: formState.code,
        description: formState.description || undefined,
        entity_type: formState.entity_type?.toLowerCase(),
        chain_type: (formState.chain_type || 'sequential').toLowerCase() as 'sequential' | 'parallel' | 'any_one',
        steps: stepsData as any,
      })
      message.success('Approval chain created successfully')
    }

    showModal.value = false
    await fetchChains()
  } catch (error: any) {
    if (error.response?.data?.error?.message) {
      message.error(error.response.data.error.message)
    } else if (error.response?.data?.detail) {
      // Handle Pydantic validation errors
      const detail = error.response.data.detail
      if (Array.isArray(detail)) {
        const messages = detail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join(', ')
        message.error(messages)
      } else {
        message.error(String(detail))
      }
    } else if (!error.errorFields) {
      message.error('Failed to save approval chain')
    }
  } finally {
    saving.value = false
  }
}

const toggleChain = async (chain: ApprovalChain) => {
  try {
    await updateApprovalChainApi(chain.id as any, { is_active: !chain.is_active })
    message.success(`Approval chain ${chain.is_active ? 'deactivated' : 'activated'} successfully`)
    await fetchChains()
  } catch {
    message.error('Failed to update approval chain status')
  }
}

const deleteChain = (chain: ApprovalChain) => {
  Modal.confirm({
    title: 'Delete Approval Chain',
    content: `Are you sure you want to delete "${chain.name}"? This cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    async onOk() {
      try {
        await deleteApprovalChainApi(chain.id as any)
        message.success('Approval chain deleted successfully')
        await fetchChains()
      } catch {
        message.error('Failed to delete approval chain')
      }
    },
  })
}

const getChainTypeColor = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'sequential': return 'blue'
    case 'parallel': return 'green'
    case 'any_one': return 'orange'
    default: return 'default'
  }
}

const getChainTypeLabel = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'sequential': return 'Sequential'
    case 'parallel': return 'Parallel'
    case 'any_one': return 'Any One'
    default: return type || 'Unknown'
  }
}

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Type', key: 'chain_type', width: 120 },
  { title: 'Steps', key: 'steps', width: 80 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Actions', key: 'actions', width: 200, fixed: 'right' as const },
]

onMounted(() => {
  fetchChains()
})
</script>

<template>
  <div class="approvals-page">
    <PageHeader
      title="Approval Chains"
      sub-title="Configure multi-level approval workflows"
    >
      <template #extra>
        <Button type="primary" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          Create Chain
        </Button>
      </template>
    </PageHeader>

    <Card>
      <Table
        :columns="columns"
        :data-source="chains"
        :loading="loading"
        :pagination="{ pageSize: 20 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'chain_type'">
            <Tag :color="getChainTypeColor(record.chain_type)">
              {{ getChainTypeLabel(record.chain_type) }}
            </Tag>
          </template>

          <template v-else-if="column.key === 'steps'">
            <Badge :count="record.steps?.length || 0" :number-style="{ backgroundColor: '#1890ff' }" />
          </template>

          <template v-else-if="column.key === 'status'">
            <Tag :color="record.is_active ? 'green' : 'default'">
              {{ record.is_active ? 'Active' : 'Inactive' }}
            </Tag>
          </template>

          <template v-else-if="column.key === 'actions'">
            <Space>
              <Tooltip title="View Details">
                <Button type="text" size="small" @click="viewChain(record as any as ApprovalChain)">
                  <template #icon><EyeOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip title="Edit">
                <Button type="text" size="small" @click="openEditModal(record as any as ApprovalChain)">
                  <template #icon><EditOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip :title="record.is_active ? 'Deactivate' : 'Activate'">
                <Button type="text" size="small" @click="toggleChain(record as any as ApprovalChain)">
                  <template #icon>
                    <PauseCircleOutlined v-if="record.is_active" />
                    <PlayCircleOutlined v-else />
                  </template>
                </Button>
              </Tooltip>
              <Tooltip title="Delete">
                <Button type="text" size="small" danger @click="deleteChain(record as any as ApprovalChain)">
                  <template #icon><DeleteOutlined /></template>
                </Button>
              </Tooltip>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- Create/Edit Modal -->
    <Modal
      v-model:open="showModal"
      :title="isEditing ? 'Edit Approval Chain' : 'Create Approval Chain'"
      width="800px"
      :confirmLoading="saving"
      @ok="handleSave"
      @cancel="showModal = false"
    >
      <Form ref="formRef" :model="formState" :rules="rules" layout="vertical">
        <Row :gutter="16">
          <Col :span="12">
            <FormItem label="Chain Name" name="name">
              <Input v-model:value="formState.name" placeholder="e.g., High Value Order Approval" />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="Chain Code" name="code">
              <Input
                v-model:value="formState.code"
                placeholder="e.g., high_value_order_approval"
                :disabled="isEditing"
              />
              <div class="text-muted">Unique identifier (lowercase, underscores allowed)</div>
            </FormItem>
          </Col>
        </Row>

        <Row :gutter="16">
          <Col :span="12">
            <FormItem label="Entity Type" name="entity_type">
              <Select v-model:value="formState.entity_type" placeholder="Select entity type" :disabled="isEditing">
                <SelectOption v-for="opt in entityTypeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="Chain Type" name="chain_type">
              <Select v-model:value="formState.chain_type">
                <SelectOption v-for="opt in chainTypeOptions" :key="opt.value" :value="opt.value">
                  <div>
                    <strong>{{ opt.label }}</strong>
                    <div class="text-muted">{{ opt.description }}</div>
                  </div>
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
        </Row>

        <FormItem label="Description" name="description">
          <Textarea
            v-model:value="formState.description"
            placeholder="Describe when this approval chain is used"
            :rows="2"
          />
        </FormItem>

        <Divider orientation="left">Approval Steps</Divider>

        <div v-for="(step, index) in formState.steps" :key="step._key" class="step-card">
          <Card size="small" :title="`Step ${step.step_order}`">
            <template #extra>
              <Button
                type="text"
                danger
                size="small"
                @click="removeStep(index)"
                :disabled="formState.steps.length <= 1"
              >
                <template #icon><DeleteOutlined /></template>
              </Button>
            </template>

            <Row :gutter="16">
              <Col :span="8">
                <FormItem label="Step Name">
                  <Input v-model:value="step.name" placeholder="Step name" />
                </FormItem>
              </Col>
              <Col :span="8">
                <FormItem label="Approver Type">
                  <Select v-model:value="step.approver_type">
                    <SelectOption v-for="opt in approverTypeOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </SelectOption>
                  </Select>
                </FormItem>
              </Col>
              <Col :span="8">
                <FormItem label="SLA (Hours)">
                  <InputNumber v-model:value="step.sla_hours" :min="1" :max="720" style="width: 100%" />
                </FormItem>
              </Col>
            </Row>

            <Row :gutter="16">
              <Col :span="8" v-if="step.approver_type === 'role'">
                <FormItem label="Role Name">
                  <Input v-model:value="step.approver_role" placeholder="e.g., manager" />
                </FormItem>
              </Col>
              <Col :span="8">
                <FormItem label="Options">
                  <Checkbox v-model:checked="step.can_delegate">Can Delegate</Checkbox>
                  <Checkbox v-model:checked="step.can_reassign" style="margin-left: 8px">Can Reassign</Checkbox>
                </FormItem>
              </Col>
            </Row>
          </Card>
        </div>

        <Button type="dashed" block @click="addStep" class="mt-3">
          <template #icon><PlusOutlined /></template>
          Add Step
        </Button>
      </Form>
    </Modal>

    <!-- View Chain Modal -->
    <Modal
      v-model:open="showViewModal"
      :title="selectedChain?.name"
      width="700px"
      :footer="null"
    >
      <div v-if="selectedChain">
        <Descriptions :column="2" bordered size="small" class="mb-4">
          <DescriptionsItem label="Chain Type">
            <Tag :color="getChainTypeColor(selectedChain.chain_type)">
              {{ getChainTypeLabel(selectedChain.chain_type) }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="Status">
            <Tag :color="selectedChain.is_active ? 'green' : 'default'">
              {{ selectedChain.is_active ? 'Active' : 'Inactive' }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="Description" :span="2">
            {{ selectedChain.description || '-' }}
          </DescriptionsItem>
        </Descriptions>

        <Divider orientation="left">
          <TeamOutlined /> Steps ({{ selectedChain.steps?.length || 0 }})
        </Divider>

        <Timeline>
          <TimelineItem v-for="step in selectedChain.steps" :key="step.id" color="blue">
            <div class="step-timeline-item">
              <strong>{{ step.name }}</strong>
              <div class="step-details">
                <Tag>{{ step.approver_type }}</Tag>
                <span v-if="step.approver_role" class="ml-2">Role: {{ step.approver_role }}</span>
                <span class="ml-2">SLA: {{ step.sla_hours }}h</span>
                <Tag v-if="step.can_delegate" color="blue" class="ml-2">Can Delegate</Tag>
                <Tag v-if="step.can_reassign" color="green" class="ml-2">Can Reassign</Tag>
              </div>
            </div>
          </TimelineItem>
        </Timeline>
      </div>
    </Modal>
  </div>
</template>

<script lang="ts">
export default {
  name: 'ApprovalChainsList',
}
</script>

<style scoped>
.approvals-page {
  padding: 0;
}

.step-card {
  margin-bottom: 12px;
}

.text-muted {
  color: #999;
  font-size: 12px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-3 {
  margin-top: 12px;
}

.ml-2 {
  margin-left: 8px;
}

.step-timeline-item {
  padding-bottom: 8px;
}

.step-details {
  margin-top: 4px;
  font-size: 12px;
}
</style>
