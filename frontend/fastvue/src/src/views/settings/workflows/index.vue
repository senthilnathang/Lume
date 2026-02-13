<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  EyeOutlined,
  BranchesOutlined,
  NodeIndexOutlined,
  SwapRightOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  SettingOutlined,
  CopyOutlined,
} from '@ant-design/icons-vue'
import {
  Button,
  Card,
  Table,
  Tag,
  Badge,
  Tooltip,
  Modal,
  Select,
  SelectOption,
  RadioButton,
  RadioGroup,
  Spin,
  Empty,
  Dropdown,
  Menu,
  MenuItem,
  MenuDivider,
  Space,
  message,
} from 'ant-design-vue'
import { getWorkflowDefinitionsApi, createWorkflowDefinitionApi, updateWorkflowDefinitionApi, deleteWorkflowDefinitionApi } from '#/api/base'

interface WorkflowState {
  id?: string
  code: string
  name: string
  state_type?: string
  is_start?: boolean
  is_end?: boolean
  sequence?: number
  sla_hours?: number
  allow_edit?: boolean
}

interface WorkflowTransition {
  id?: string
  from_state_code: string
  to_state_code: string
  name: string
  trigger_type: string
  requires_approval?: boolean
  approval_chain_id?: string
}

interface WorkflowDefinition {
  id: string
  name: string
  code?: string
  description?: string
  entity_type: string
  model_name?: string
  is_active: boolean
  version: number
  states?: WorkflowState[]
  transitions?: WorkflowTransition[]
}

const router = useRouter()

const loading = ref(false)
const workflows = ref<WorkflowDefinition[]>([])
const showViewModal = ref(false)
const selectedWorkflow = ref<WorkflowDefinition | null>(null)
const viewMode = ref<'cards' | 'table'>('cards')

// Entity type options for filtering
const entityTypes = [
  { value: '', label: 'All Types', icon: 'AppstoreOutlined' },
  { value: 'sales_order', label: 'Sales Order', color: '#52c41a' },
  { value: 'purchase_order', label: 'Purchase Order', color: '#1890ff' },
  { value: 'invoice', label: 'Invoice', color: '#722ed1' },
  { value: 'quotation', label: 'Quotation', color: '#fa8c16' },
  { value: 'delivery_challan', label: 'Delivery Challan', color: '#13c2c2' },
  { value: 'grn', label: 'Goods Receipt Note', color: '#eb2f96' },
]

const filterEntityType = ref('')

const filteredWorkflows = computed(() => {
  if (!filterEntityType.value) return workflows.value
  return workflows.value.filter(w => getWorkflowEntityType(w) === filterEntityType.value)
})

const activeWorkflowsCount = computed(() => workflows.value.filter(w => w.is_active).length)

const fetchWorkflows = async () => {
  loading.value = true
  try {
    const response = await getWorkflowDefinitionsApi({})
    workflows.value = (response as any).items || (response as any).data?.items || response || []
  } catch {
    message.error('Failed to load workflows')
  } finally {
    loading.value = false
  }
}

const viewWorkflow = (workflow: WorkflowDefinition) => {
  selectedWorkflow.value = workflow
  showViewModal.value = true
}

const toggleWorkflow = async (workflow: WorkflowDefinition) => {
  try {
    // API expects code, not id
    const code = workflow.code || workflow.id
    await updateWorkflowDefinitionApi(code, { is_active: !workflow.is_active })
    message.success(`Workflow ${workflow.is_active ? 'deactivated' : 'activated'} successfully`)
    await fetchWorkflows()
  } catch {
    message.error('Failed to update workflow status')
  }
}

const duplicateWorkflow = async (workflow: WorkflowDefinition) => {
  Modal.confirm({
    title: 'Duplicate Workflow',
    content: `Create a copy of "${workflow.name}"?`,
    okText: 'Duplicate',
    cancelText: 'Cancel',
    async onOk() {
      try {
        // Generate a unique code for the duplicate
        const baseCode = workflow.code || workflow.entity_type || 'workflow'
        const newCode = `${baseCode}_copy_${Date.now()}`

        const newWorkflow = {
          name: `${workflow.name} (Copy)`,
          code: newCode,
          model_name: workflow.model_name || workflow.entity_type,
          description: workflow.description,
          states: workflow.states?.map((s, index) => ({
            code: s.code,
            name: s.name,
            sequence: s.sequence ?? index,
            is_start: s.is_start ?? getStateType(s) === 'INITIAL',
            is_end: s.is_end ?? getStateType(s) === 'TERMINAL',
          })) || [],
        }
        await createWorkflowDefinitionApi(newWorkflow)
        message.success('Workflow duplicated successfully')
        await fetchWorkflows()
      } catch {
        message.error('Failed to duplicate workflow')
      }
    },
  })
}

const deleteWorkflow = (workflow: WorkflowDefinition) => {
  Modal.confirm({
    title: 'Delete Workflow',
    content: `Are you sure you want to delete "${workflow.name}"? This cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    async onOk() {
      try {
        // API expects code, not id
        const code = workflow.code || workflow.id
        await deleteWorkflowDefinitionApi(code)
        message.success('Workflow deleted successfully')
        await fetchWorkflows()
      } catch {
        message.error('Failed to delete workflow')
      }
    },
  })
}

const getEntityTypeColor = (entityType: string | undefined) => {
  if (!entityType) return '#1890ff'
  const type = entityTypes.find(t => t.value === entityType)
  return type?.color || '#1890ff'
}

// Helper to get entity type from workflow (handles both entity_type and model_name)
const getWorkflowEntityType = (workflow: WorkflowDefinition): string => {
  return workflow.entity_type || workflow.model_name || ''
}

const getEntityTypeLabel = (entityType: string | undefined) => {
  if (!entityType) return 'Unknown'
  const type = entityTypes.find(t => t.value === entityType)
  return type?.label || entityType.replace(/_/g, ' ').toUpperCase()
}

const getTriggerTypeColor = (type: string) => {
  switch (type) {
    case 'MANUAL': return 'blue'
    case 'AUTO': return 'green'
    case 'APPROVAL': return 'orange'
    case 'SCHEDULED': return 'purple'
    default: return 'default'
  }
}

// Helper to get state type from backend response (which uses is_start/is_end)
const getStateType = (state: WorkflowState): string => {
  if (state.state_type) return state.state_type
  if (state.is_start) return 'INITIAL'
  if (state.is_end) return 'TERMINAL'
  return 'INTERMEDIATE'
}

const columns = [
  { title: 'Workflow', key: 'workflow' },
  { title: 'Entity Type', dataIndex: 'entity_type', key: 'entity_type', width: 150 },
  { title: 'States', key: 'states', width: 100 },
  { title: 'Transitions', key: 'transitions', width: 100 },
  { title: 'Version', dataIndex: 'version', key: 'version', width: 80 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Actions', key: 'actions', width: 200, fixed: 'right' as const },
]

const transitionColumns = [
  { title: 'From State', dataIndex: 'from_state_code', width: 150 },
  { title: '', key: 'arrow', width: 50 },
  { title: 'To State', dataIndex: 'to_state_code', width: 150 },
  { title: 'Transition Name', dataIndex: 'name' },
  { title: 'Trigger', dataIndex: 'trigger_type', width: 120 },
  { title: 'Approval', key: 'approval', width: 120 },
]

onMounted(() => {
  fetchWorkflows()
})
</script>

<template>
  <div class="workflows-page">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="page-title">
            <BranchesOutlined /> Workflow Definitions
          </h1>
          <p class="page-subtitle">Configure document workflows and state machines</p>
        </div>
        <div class="header-actions">
          <Button type="primary" size="large" @click="router.push('/settings/workflows/create')">
            <template #icon><PlusOutlined /></template>
            Create Workflow
          </Button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%)">
            <BranchesOutlined />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ workflows.length }}</span>
            <span class="stat-label">Total Workflows</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%)">
            <CheckCircleOutlined />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ activeWorkflowsCount }}</span>
            <span class="stat-label">Active</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #faad14 0%, #d48806 100%)">
            <NodeIndexOutlined />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ workflows.reduce((sum, w) => sum + (w.states?.length || 0), 0) }}</span>
            <span class="stat-label">Total States</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #722ed1 0%, #531dab 100%)">
            <SwapRightOutlined />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ workflows.reduce((sum, w) => sum + (w.transitions?.length || 0), 0) }}</span>
            <span class="stat-label">Total Transitions</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <Select
          v-model:value="filterEntityType"
          style="width: 200px"
          placeholder="Filter by entity type"
        >
          <SelectOption v-for="type in entityTypes" :key="type.value" :value="type.value">
            <div class="entity-option">
              <span class="entity-dot" :style="{ backgroundColor: type.color || '#1890ff' }"></span>
              {{ type.label }}
            </div>
          </SelectOption>
        </Select>
      </div>
      <div class="toolbar-right">
        <RadioGroup v-model:value="viewMode" button-style="solid">
          <RadioButton value="cards">
            <AppstoreOutlined /> Cards
          </RadioButton>
          <RadioButton value="table">
            <UnorderedListOutlined /> Table
          </RadioButton>
        </RadioGroup>
      </div>
    </div>

    <!-- Card View -->
    <div v-if="viewMode === 'cards'" class="workflow-cards">
      <Spin :spinning="loading">
        <Empty v-if="filteredWorkflows.length === 0" description="No workflows found" />

        <div v-else class="cards-grid">
          <div
            v-for="workflow in filteredWorkflows"
            :key="workflow.id"
            class="workflow-card"
            :class="{ inactive: !workflow.is_active }"
          >
            <!-- Card Header -->
            <div class="card-header">
              <div class="card-title-row">
                <div class="entity-badge" :style="{ backgroundColor: getEntityTypeColor(getWorkflowEntityType(workflow)) }">
                  {{ getEntityTypeLabel(getWorkflowEntityType(workflow)) }}
                </div>
                <Dropdown>
                  <Button type="text" size="small">
                    <template #icon><SettingOutlined /></template>
                  </Button>
                  <template #overlay>
                    <Menu>
                      <MenuItem @click="viewWorkflow(workflow)">
                        <EyeOutlined /> View Details
                      </MenuItem>
                      <MenuItem @click="router.push(`/settings/workflows/${workflow.code || workflow.id}/edit`)">
                        <EditOutlined /> Edit
                      </MenuItem>
                      <MenuItem @click="duplicateWorkflow(workflow)">
                        <CopyOutlined /> Duplicate
                      </MenuItem>
                      <MenuDivider />
                      <MenuItem @click="toggleWorkflow(workflow)">
                        <template v-if="workflow.is_active">
                          <PauseCircleOutlined /> Deactivate
                        </template>
                        <template v-else>
                          <PlayCircleOutlined /> Activate
                        </template>
                      </MenuItem>
                      <MenuDivider />
                      <MenuItem danger @click="deleteWorkflow(workflow)">
                        <DeleteOutlined /> Delete
                      </MenuItem>
                    </Menu>
                  </template>
                </Dropdown>
              </div>
              <h3 class="card-title">{{ workflow.name }}</h3>
              <p class="card-description">{{ workflow.description || 'No description' }}</p>
            </div>

            <!-- Workflow Diagram Preview -->
            <div class="workflow-preview">
              <div class="states-flow">
                <template v-for="(state, index) in (workflow.states || []).slice(0, 5)" :key="state.id || state.code">
                  <div class="state-node" :class="getStateType(state).toLowerCase()">
                    <span class="state-name">{{ state.name }}</span>
                  </div>
                  <div v-if="index < Math.min(4, (workflow.states?.length || 0) - 1)" class="flow-arrow">
                    <SwapRightOutlined />
                  </div>
                </template>
                <div v-if="(workflow.states?.length || 0) > 5" class="state-more">
                  +{{ (workflow.states?.length || 0) - 5 }} more
                </div>
              </div>
            </div>

            <!-- Card Stats -->
            <div class="card-stats">
              <div class="stat-item">
                <NodeIndexOutlined />
                <span>{{ workflow.states?.length || 0 }} States</span>
              </div>
              <div class="stat-item">
                <SwapRightOutlined />
                <span>{{ workflow.transitions?.length || 0 }} Transitions</span>
              </div>
              <div class="stat-item">
                <span class="version-badge">v{{ workflow.version }}</span>
              </div>
            </div>

            <!-- Card Footer -->
            <div class="card-footer">
              <Tag :color="workflow.is_active ? 'success' : 'default'" class="status-tag">
                <template #icon>
                  <CheckCircleOutlined v-if="workflow.is_active" />
                  <CloseCircleOutlined v-else />
                </template>
                {{ workflow.is_active ? 'Active' : 'Inactive' }}
              </Tag>
              <div class="card-actions">
                <Button type="text" size="small" @click="viewWorkflow(workflow)">
                  <EyeOutlined />
                </Button>
                <Button type="text" size="small" @click="router.push(`/settings/workflows/${workflow.code || workflow.id}/edit`)">
                  <EditOutlined />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Spin>
    </div>

    <!-- Table View -->
    <div v-else class="workflow-table">
      <Card>
        <Table
          :columns="columns"
          :data-source="filteredWorkflows"
          :loading="loading"
          :pagination="{ pageSize: 20 }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'workflow'">
              <div class="workflow-cell">
                <span class="workflow-name">{{ record.name }}</span>
                <span class="workflow-desc">{{ record.description || '-' }}</span>
              </div>
            </template>

            <template v-else-if="column.key === 'entity_type'">
              <Tag :color="getEntityTypeColor(getWorkflowEntityType(record as WorkflowDefinition))">
                {{ getEntityTypeLabel(getWorkflowEntityType(record as WorkflowDefinition)) }}
              </Tag>
            </template>

            <template v-else-if="column.key === 'states'">
              <Badge :count="record.states?.length || 0" :number-style="{ backgroundColor: '#52c41a' }" />
            </template>

            <template v-else-if="column.key === 'transitions'">
              <Badge :count="record.transitions?.length || 0" :number-style="{ backgroundColor: '#1890ff' }" />
            </template>

            <template v-else-if="column.key === 'status'">
              <Tag :color="record.is_active ? 'success' : 'default'">
                <template #icon>
                  <CheckCircleOutlined v-if="record.is_active" />
                  <CloseCircleOutlined v-else />
                </template>
                {{ record.is_active ? 'Active' : 'Inactive' }}
              </Tag>
            </template>

            <template v-else-if="column.key === 'actions'">
              <Space>
                <Tooltip title="View Details">
                  <Button type="text" size="small" @click="viewWorkflow(record as WorkflowDefinition)">
                    <template #icon><EyeOutlined /></template>
                  </Button>
                </Tooltip>
                <Tooltip title="Edit">
                  <Button type="text" size="small" @click="router.push(`/settings/workflows/${record.code || record.id}/edit`)">
                    <template #icon><EditOutlined /></template>
                  </Button>
                </Tooltip>
                <Tooltip title="Duplicate">
                  <Button type="text" size="small" @click="duplicateWorkflow(record as WorkflowDefinition)">
                    <template #icon><CopyOutlined /></template>
                  </Button>
                </Tooltip>
                <Tooltip :title="record.is_active ? 'Deactivate' : 'Activate'">
                  <Button type="text" size="small" @click="toggleWorkflow(record as WorkflowDefinition)">
                    <template #icon>
                      <PauseCircleOutlined v-if="record.is_active" />
                      <PlayCircleOutlined v-else />
                    </template>
                  </Button>
                </Tooltip>
                <Tooltip title="Delete">
                  <Button type="text" size="small" danger @click="deleteWorkflow(record as WorkflowDefinition)">
                    <template #icon><DeleteOutlined /></template>
                  </Button>
                </Tooltip>
              </Space>
            </template>
          </template>
        </Table>
      </Card>
    </div>

    <!-- View Workflow Modal -->
    <Modal
      v-model:open="showViewModal"
      :title="null"
      width="1000px"
      :footer="null"
      class="workflow-modal"
    >
      <div v-if="selectedWorkflow" class="workflow-detail">
        <!-- Modal Header -->
        <div class="detail-header">
          <div class="detail-title-section">
            <div class="entity-badge lg" :style="{ backgroundColor: getEntityTypeColor(getWorkflowEntityType(selectedWorkflow)) }">
              {{ getEntityTypeLabel(getWorkflowEntityType(selectedWorkflow)) }}
            </div>
            <h2 class="detail-title">{{ selectedWorkflow.name }}</h2>
            <p class="detail-description">{{ selectedWorkflow.description || 'No description provided' }}</p>
          </div>
          <div class="detail-meta">
            <Tag :color="selectedWorkflow.is_active ? 'success' : 'default'" size="large">
              {{ selectedWorkflow.is_active ? 'Active' : 'Inactive' }}
            </Tag>
            <span class="version-info">Version {{ selectedWorkflow.version }}</span>
          </div>
        </div>

        <!-- Visual Workflow Diagram -->
        <div class="workflow-diagram">
          <h4 class="section-title">
            <NodeIndexOutlined /> Workflow Flow
          </h4>
          <div class="diagram-container">
            <div class="flow-diagram">
              <template v-for="(state, index) in selectedWorkflow.states" :key="state.id || state.code">
                <div class="diagram-state" :class="getStateType(state).toLowerCase()">
                  <div class="state-header">
                    <span class="state-type-badge">{{ getStateType(state) }}</span>
                  </div>
                  <div class="state-body">
                    <span class="state-code">{{ state.code }}</span>
                    <span class="state-label">{{ state.name }}</span>
                  </div>
                  <div class="state-footer">
                    <span v-if="state.sla_hours" class="sla-badge">
                      <ClockCircleOutlined /> {{ state.sla_hours }}h SLA
                    </span>
                    <span v-if="state.allow_edit" class="edit-badge">
                      <EditOutlined /> Editable
                    </span>
                  </div>
                </div>
                <div v-if="index < (selectedWorkflow.states?.length || 0) - 1" class="diagram-arrow">
                  <div class="arrow-line"></div>
                  <SwapRightOutlined class="arrow-icon" />
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Transitions Table -->
        <div class="transitions-section">
          <h4 class="section-title">
            <SwapRightOutlined /> Transitions ({{ selectedWorkflow.transitions?.length || 0 }})
          </h4>
          <Table
            :columns="transitionColumns"
            :data-source="selectedWorkflow.transitions"
            :pagination="false"
            size="small"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'arrow'">
                <SwapRightOutlined style="color: #1890ff" />
              </template>
              <template v-else-if="column.dataIndex === 'from_state_code'">
                <Tag color="blue">{{ record.from_state_code }}</Tag>
              </template>
              <template v-else-if="column.dataIndex === 'to_state_code'">
                <Tag color="green">{{ record.to_state_code }}</Tag>
              </template>
              <template v-else-if="column.dataIndex === 'trigger_type'">
                <Tag :color="getTriggerTypeColor(record.trigger_type)">{{ record.trigger_type }}</Tag>
              </template>
              <template v-else-if="column.key === 'approval'">
                <Tag v-if="record.requires_approval" color="orange">
                  <CheckCircleOutlined /> Required
                </Tag>
                <span v-else class="text-muted">-</span>
              </template>
            </template>
          </Table>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script lang="ts">
export default {
  name: 'WorkflowsList',
}
</script>

<style scoped>
.workflows-page {
  padding: 0;
  background: #f5f5f5;
  min-height: calc(100vh - 64px);
}

.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 32px 24px;
  color: #fff;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  max-width: 1400px;
  margin: 0 auto;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-subtitle {
  margin: 8px 0 0;
  opacity: 0.85;
  font-size: 15px;
}

.stats-row {
  display: flex;
  gap: 16px;
  margin-top: 24px;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
}

.stat-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #fff;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.stat-label {
  font-size: 13px;
  opacity: 0.85;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  max-width: 1400px;
  margin: 0 auto;
}

.entity-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.entity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* Card View Styles */
.workflow-cards {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.workflow-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
}

.workflow-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.workflow-card.inactive {
  opacity: 0.7;
}

.card-header {
  padding: 20px 20px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.entity-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.entity-badge.lg {
  padding: 6px 16px;
  font-size: 12px;
}

.card-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
  color: #262626;
}

.card-description {
  margin: 0;
  font-size: 13px;
  color: #8c8c8c;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.workflow-preview {
  padding: 20px;
  background: #fafafa;
  overflow-x: auto;
}

.states-flow {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: max-content;
}

.state-node {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.state-node.initial {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.state-node.intermediate {
  background: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
}

.state-node.terminal {
  background: #fff1f0;
  color: #f5222d;
  border: 1px solid #ffa39e;
}

.flow-arrow {
  color: #bfbfbf;
}

.state-more {
  padding: 8px 12px;
  background: #f0f0f0;
  border-radius: 8px;
  font-size: 11px;
  color: #8c8c8c;
}

.card-stats {
  display: flex;
  padding: 12px 20px;
  border-bottom: 1px solid #f0f0f0;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #595959;
}

.version-badge {
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
}

.status-tag {
  margin: 0;
}

.card-actions {
  display: flex;
  gap: 4px;
}

/* Table View Styles */
.workflow-table {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.workflow-cell {
  display: flex;
  flex-direction: column;
}

.workflow-name {
  font-weight: 500;
  color: #262626;
}

.workflow-desc {
  font-size: 12px;
  color: #8c8c8c;
}

/* Modal Styles */
.workflow-modal :deep(.ant-modal-body) {
  padding: 0;
}

.workflow-detail {
  padding: 0;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.detail-title {
  margin: 12px 0 4px;
  font-size: 24px;
  font-weight: 600;
  color: #fff;
}

.detail-description {
  margin: 0;
  opacity: 0.85;
}

.detail-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.version-info {
  font-size: 13px;
  opacity: 0.85;
}

.workflow-diagram {
  padding: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.section-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  display: flex;
  align-items: center;
  gap: 8px;
}

.diagram-container {
  overflow-x: auto;
  padding: 16px 0;
}

.flow-diagram {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: max-content;
}

.diagram-state {
  min-width: 140px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.diagram-state.initial {
  border: 2px solid #52c41a;
}

.diagram-state.intermediate {
  border: 2px solid #1890ff;
}

.diagram-state.terminal {
  border: 2px solid #f5222d;
}

.state-header {
  padding: 8px 12px;
  text-align: center;
}

.diagram-state.initial .state-header {
  background: #f6ffed;
}

.diagram-state.intermediate .state-header {
  background: #e6f7ff;
}

.diagram-state.terminal .state-header {
  background: #fff1f0;
}

.state-type-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.diagram-state.initial .state-type-badge {
  color: #52c41a;
}

.diagram-state.intermediate .state-type-badge {
  color: #1890ff;
}

.diagram-state.terminal .state-type-badge {
  color: #f5222d;
}

.state-body {
  padding: 16px 12px;
  text-align: center;
  background: #fff;
}

.state-code {
  display: block;
  font-size: 11px;
  color: #8c8c8c;
  margin-bottom: 4px;
}

.state-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #262626;
}

.state-footer {
  padding: 8px 12px;
  background: #fafafa;
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sla-badge,
.edit-badge {
  font-size: 10px;
  color: #8c8c8c;
  display: flex;
  align-items: center;
  gap: 4px;
}

.diagram-arrow {
  display: flex;
  align-items: center;
  color: #bfbfbf;
}

.arrow-line {
  width: 24px;
  height: 2px;
  background: #d9d9d9;
}

.arrow-icon {
  font-size: 16px;
  color: #1890ff;
}

.transitions-section {
  padding: 24px;
}

.text-muted {
  color: #bfbfbf;
}
</style>
