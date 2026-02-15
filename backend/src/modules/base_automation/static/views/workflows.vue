<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  Badge,
  Button,
  Card,
  Dropdown,
  Empty,
  Menu,
  message,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  MenuItem,
  RadioGroup,
  RadioButton,
  MenuDivider,
  SelectOption,
} from 'ant-design-vue'
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
  getWorkflowDefinitionsApi,
  getWorkflowDefinitionApi,
  createWorkflowDefinitionApi,
  updateWorkflowDefinitionApi,
  deleteWorkflowDefinitionApi,
} from '#/api/base_automation'
import WorkflowDesigner from './workflow-designer.vue'

const loading = ref(false)
const workflows = ref([])
const showViewModal = ref(false)
const selectedWorkflow = ref(null)
const viewMode = ref('cards')

// Form view state
const showForm = ref(false)
const editingWorkflowId = ref(null)

// Entity type options for filtering
const entityTypes = [
  { value: '', label: 'All Types', color: '#1890ff' },
  { value: 'hr.leave', label: 'Leave Request', color: '#52c41a' },
  { value: 'hr.expense', label: 'Expense', color: '#1890ff' },
  { value: 'hr.travel', label: 'Travel Request', color: '#722ed1' },
  { value: 'hr.loan', label: 'Loan Request', color: '#fa8c16' },
  { value: 'hr.overtime', label: 'Overtime', color: '#13c2c2' },
  { value: 'purchase.order', label: 'Purchase Order', color: '#eb2f96' },
  { value: 'project.project', label: 'Project', color: '#faad14' },
  { value: 'project.task', label: 'Task', color: '#2f54eb' },
]

const filterEntityType = ref('')

const filteredWorkflows = computed(() => {
  if (!filterEntityType.value) return workflows.value
  return workflows.value.filter(w => w.model_name === filterEntityType.value)
})

const activeWorkflowsCount = computed(() => workflows.value.filter(w => w.is_active).length)

const fetchWorkflows = async () => {
  loading.value = true
  try {
    const response = await getWorkflowDefinitionsApi({})
    workflows.value = response.items || response.data?.items || response || []
  } catch (e) {
    message.error('Failed to load workflows')
    console.error(e)
  } finally {
    loading.value = false
  }
}

const viewWorkflow = async (workflow) => {
  try {
    const detail = await getWorkflowDefinitionApi(workflow.code)
    selectedWorkflow.value = detail
    showViewModal.value = true
  } catch (e) {
    message.error('Failed to load workflow details')
  }
}

// Form view handlers
const openCreateForm = () => {
  editingWorkflowId.value = null
  showForm.value = true
}

const openEditForm = (workflow) => {
  editingWorkflowId.value = workflow.code
  showForm.value = true
}

const handleFormBack = () => {
  showForm.value = false
  editingWorkflowId.value = null
}

const handleFormSaved = () => {
  fetchWorkflows()
}

const toggleWorkflow = async (workflow) => {
  try {
    await updateWorkflowDefinitionApi(workflow.code, { is_active: !workflow.is_active })
    message.success(`Workflow ${workflow.is_active ? 'deactivated' : 'activated'} successfully`)
    await fetchWorkflows()
  } catch (e) {
    message.error('Failed to update workflow status')
  }
}

const duplicateWorkflow = async (workflow) => {
  Modal.confirm({
    title: 'Duplicate Workflow',
    content: `Create a copy of "${workflow.name}"?`,
    okText: 'Duplicate',
    cancelText: 'Cancel',
    async onOk() {
      try {
        const detail = await getWorkflowDefinitionApi(workflow.code)
        const newWorkflow = {
          model_name: detail.model_name,
          name: `${detail.name} (Copy)`,
          code: `${detail.code}_copy`,
          description: detail.description,
          state_field: detail.state_field,
          default_state: detail.default_state,
          states: detail.states?.map(s => ({
            code: s.code,
            name: s.name,
            sequence: s.sequence,
            color: s.color,
            is_start: s.is_start,
            is_end: s.is_end,
            sla_hours: s.sla_hours,
          })) || [],
        }
        await createWorkflowDefinitionApi(newWorkflow)
        message.success('Workflow duplicated successfully')
        await fetchWorkflows()
      } catch (e) {
        message.error('Failed to duplicate workflow')
      }
    },
  })
}

const deleteWorkflow = (workflow) => {
  Modal.confirm({
    title: 'Delete Workflow',
    content: `Are you sure you want to delete "${workflow.name}"? This cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    async onOk() {
      try {
        await deleteWorkflowDefinitionApi(workflow.code)
        message.success('Workflow deleted successfully')
        await fetchWorkflows()
      } catch (e) {
        message.error('Failed to delete workflow')
      }
    },
  })
}

const getEntityTypeColor = (modelName) => {
  const type = entityTypes.find(t => t.value === modelName)
  return type?.color || '#1890ff'
}

const getEntityTypeLabel = (modelName) => {
  const type = entityTypes.find(t => t.value === modelName)
  return type?.label || modelName?.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || ''
}

const getStateTypeColor = (state) => {
  if (state.is_start) return '#52c41a'
  if (state.is_end) return '#f5222d'
  return '#1890ff'
}

const getStateTypeClass = (state) => {
  if (state.is_start) return 'initial'
  if (state.is_end) return 'terminal'
  return 'intermediate'
}

const getStateTypeLabel = (state) => {
  if (state.is_start) return 'INITIAL'
  if (state.is_end) return 'TERMINAL'
  return 'INTERMEDIATE'
}

const columns = [
  { title: 'Workflow', key: 'workflow' },
  { title: 'Entity Type', dataIndex: 'model_name', key: 'model_name', width: 150 },
  { title: 'States', key: 'states', width: 100 },
  { title: 'Transitions', key: 'transitions', width: 100 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Actions', key: 'actions', width: 200, fixed: 'right' },
]

onMounted(() => {
  fetchWorkflows()
})
</script>

<template>
  <!-- Show Workflow Designer Form when creating/editing -->
  <WorkflowDesigner
    v-if="showForm"
    :workflow-id="editingWorkflowId"
    @back="handleFormBack"
    @saved="handleFormSaved"
  />

  <!-- Show List View -->
  <div v-else class="workflows-page">
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
          <Button type="primary" size="large" @click="openCreateForm">
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
        <AEmpty v-if="filteredWorkflows.length === 0" description="No workflows found" />

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
                <div class="entity-badge" :style="{ backgroundColor: getEntityTypeColor(workflow.model_name) }">
                  {{ getEntityTypeLabel(workflow.model_name) }}
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
                      <MenuItem @click="openEditForm(workflow)">
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
                <template v-for="(state, index) in (workflow.states || []).slice(0, 5)" :key="state.id || index">
                  <div class="state-node" :class="getStateTypeClass(state)">
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
                <Button type="text" size="small" @click="openEditForm(workflow)">
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

            <template v-else-if="column.key === 'model_name'">
              <Tag :color="getEntityTypeColor(record.model_name)">
                {{ getEntityTypeLabel(record.model_name) }}
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
              <div class="actions-cell flex items-center gap-1">
                <Tooltip title="View Details">
                  <Button type="text" size="small" @click="viewWorkflow(record)">
                    <template #icon><EyeOutlined /></template>
                  </Button>
                </Tooltip>
                <Tooltip title="Edit">
                  <Button type="text" size="small" @click="openEditForm(record)">
                    <template #icon><EditOutlined /></template>
                  </Button>
                </Tooltip>
                <Tooltip title="Duplicate">
                  <Button type="text" size="small" @click="duplicateWorkflow(record)">
                    <template #icon><CopyOutlined /></template>
                  </Button>
                </Tooltip>
                <Tooltip :title="record.is_active ? 'Deactivate' : 'Activate'">
                  <Button type="text" size="small" @click="toggleWorkflow(record)">
                    <template #icon>
                      <PauseCircleOutlined v-if="record.is_active" />
                      <PlayCircleOutlined v-else />
                    </template>
                  </Button>
                </Tooltip>
                <Popconfirm title="Delete?" ok-text="Delete" ok-type="danger" @confirm="deleteWorkflow(record)">
                  <Tooltip title="Delete">
                    <Button type="text" size="small" danger>
                      <template #icon><DeleteOutlined /></template>
                    </Button>
                  </Tooltip>
                </Popconfirm>
              </div>
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
            <div class="entity-badge lg" :style="{ backgroundColor: getEntityTypeColor(selectedWorkflow.model_name) }">
              {{ getEntityTypeLabel(selectedWorkflow.model_name) }}
            </div>
            <h2 class="detail-title">{{ selectedWorkflow.name }}</h2>
            <p class="detail-description">{{ selectedWorkflow.description || 'No description provided' }}</p>
          </div>
          <div class="detail-meta">
            <Tag :color="selectedWorkflow.is_active ? 'success' : 'default'" size="large">
              {{ selectedWorkflow.is_active ? 'Active' : 'Inactive' }}
            </Tag>
          </div>
        </div>

        <!-- Visual Workflow Diagram -->
        <div class="workflow-diagram">
          <h4 class="section-title">
            <NodeIndexOutlined /> Workflow Flow
          </h4>
          <div class="diagram-container">
            <div class="flow-diagram">
              <template v-for="(state, index) in selectedWorkflow.states" :key="state.id || index">
                <div class="diagram-state" :class="getStateTypeClass(state)">
                  <div class="state-header">
                    <span class="state-type-badge">{{ getStateTypeLabel(state) }}</span>
                  </div>
                  <div class="state-body">
                    <span class="state-code">{{ state.code }}</span>
                    <span class="state-label">{{ state.name }}</span>
                  </div>
                  <div class="state-footer">
                    <span v-if="state.sla_hours" class="sla-badge">
                      <ClockCircleOutlined /> {{ state.sla_hours }}h SLA
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
            :columns="[
              { title: 'From State', dataIndex: 'from_state', width: 150 },
              { title: '', key: 'arrow', width: 50 },
              { title: 'To State', dataIndex: 'to_state', width: 150 },
              { title: 'Transition Name', dataIndex: 'name' },
              { title: 'Button', dataIndex: 'button_name', width: 120 },
              { title: 'Approval', key: 'approval', width: 120 },
            ]"
            :data-source="selectedWorkflow.transitions"
            :pagination="false"
            size="small"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'arrow'">
                <SwapRightOutlined style="color: #1890ff" />
              </template>
              <template v-else-if="column.dataIndex === 'from_state'">
                <Tag color="blue">{{ record.from_state }}</Tag>
              </template>
              <template v-else-if="column.dataIndex === 'to_state'">
                <Tag color="green">{{ record.to_state }}</Tag>
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

<script>
export default {
  name: 'WorkflowsList',
}
</script>

<style scoped>
:deep(.actions-cell .ant-btn) {
  opacity: 0.55;
  transition: opacity 0.15s;
}
:deep(.ant-table-row:hover .actions-cell .ant-btn) {
  opacity: 1;
}
</style>
