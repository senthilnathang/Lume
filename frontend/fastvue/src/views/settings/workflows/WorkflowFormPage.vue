<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  BranchesOutlined,
  NodeIndexOutlined,
  SwapRightOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  DragOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons-vue'
import {
  Spin,
  Button,
  Form,
  FormItem,
  Tabs,
  TabPane,
  Row,
  Col,
  Input,
  InputNumber,
  Textarea,
  Select,
  SelectOption,
  Switch,
  Badge,
  Tag,
  RadioGroup,
  RadioButton,
  Checkbox,
  Modal,
  Alert,
  Space,
  message,
} from 'ant-design-vue'
import { getWorkflowDefinitionApi, createWorkflowDefinitionApi, updateWorkflowDefinitionApi, getApprovalChainsApi } from '#/api/base'
// import { useCompanyStore } from '#/store'

type StateType = 'INITIAL' | 'INTERMEDIATE' | 'TERMINAL'
type TransitionTrigger = 'MANUAL' | 'AUTO' | 'APPROVAL' | 'SCHEDULED'

interface ApprovalChain {
  id: string
  name: string
  chain_type: string
  is_active: boolean
}

interface FormState {
  id: string
  name: string
  code: string
  description: string
  entity_type: string
  is_active: boolean
  states: {
    id?: string
    code: string
    name: string
    state_type: StateType
    allow_edit: boolean
    allow_delete: boolean
    sla_hours?: number
    sequence: number
    entry_actions: any[]
    exit_actions: any[]
  }[]
  transitions: {
    id?: string
    from_state_code: string
    to_state_code: string
    name: string
    trigger_type: TransitionTrigger
    requires_approval: boolean
    approval_chain_id?: string
    guards: any[]
    actions: any[]
  }[]
}

const router = useRouter()
const route = useRoute()
// const companyStore = useCompanyStore()

const isEdit = computed(() => !!route.params.id)
const workflowId = computed(() => route.params.id as string)

const loading = ref(false)
const saving = ref(false)
const activeTab = ref('basic')
const approvalChains = ref<ApprovalChain[]>([])

const form = ref<FormState>({
  id: '',
  name: '',
  code: '',
  description: '',
  entity_type: '',
  is_active: true,
  states: [],
  transitions: [],
})

// State editor modal
const showStateModal = ref(false)
const editingStateIndex = ref<number | null>(null)
const stateForm = ref({
  code: '',
  name: '',
  state_type: 'INTERMEDIATE' as StateType,
  allow_edit: true,
  allow_delete: false,
  sla_hours: undefined as number | undefined,
})

// Transition editor modal
const showTransitionModal = ref(false)
const editingTransitionIndex = ref<number | null>(null)
const transitionForm = ref({
  from_state_code: '',
  to_state_code: '',
  name: '',
  trigger_type: 'MANUAL' as TransitionTrigger,
  requires_approval: false,
  approval_chain_id: undefined as string | undefined,
})

const entityTypes = [
  { value: 'sales_order', label: 'Sales Order', color: '#52c41a' },
  { value: 'purchase_order', label: 'Purchase Order', color: '#1890ff' },
  { value: 'invoice', label: 'Invoice', color: '#722ed1' },
  { value: 'quotation', label: 'Quotation', color: '#fa8c16' },
  { value: 'delivery_challan', label: 'Delivery Challan', color: '#13c2c2' },
  { value: 'grn', label: 'Goods Receipt Note', color: '#eb2f96' },
]

const stateTypes: { value: StateType; label: string; color: string }[] = [
  { value: 'INITIAL', label: 'Initial', color: '#52c41a' },
  { value: 'INTERMEDIATE', label: 'Intermediate', color: '#1890ff' },
  { value: 'TERMINAL', label: 'Terminal', color: '#f5222d' },
]

const triggerTypes: { value: TransitionTrigger; label: string; color: string }[] = [
  { value: 'MANUAL', label: 'Manual', color: 'blue' },
  { value: 'AUTO', label: 'Automatic', color: 'green' },
  { value: 'APPROVAL', label: 'Approval', color: 'orange' },
  { value: 'SCHEDULED', label: 'Scheduled', color: 'purple' },
]

const getEntityTypeColor = (entityType: string) => {
  const type = entityTypes.find(t => t.value === entityType)
  return type?.color || '#1890ff'
}

const getEntityTypeLabel = (entityType: string) => {
  const type = entityTypes.find(t => t.value === entityType)
  return type?.label || entityType.replace(/_/g, ' ').toUpperCase()
}

const getStateTypeColor = (type: StateType) => {
  const stateType = stateTypes.find(t => t.value === type)
  return stateType?.color || '#1890ff'
}

const availableStateCodes = computed(() => {
  return form.value.states.map(s => ({ value: s.code, label: `${s.name} (${s.code})` }))
})

const initialStatesCount = computed(() => form.value.states.filter(s => s.state_type === 'INITIAL').length)
const terminalStatesCount = computed(() => form.value.states.filter(s => s.state_type === 'TERMINAL').length)

const hasValidationErrors = computed(() => {
  const errors: string[] = []
  if (!form.value.name.trim()) errors.push('Workflow name is required')
  if (!form.value.code.trim()) errors.push('Workflow code is required')
  if (!form.value.entity_type) errors.push('Entity type is required')
  if (form.value.states.length === 0) errors.push('At least one state is required')
  if (initialStatesCount.value !== 1) errors.push('Exactly one initial state is required')
  if (terminalStatesCount.value === 0) errors.push('At least one terminal state is required')
  return errors
})

const fetchWorkflow = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const response = await getWorkflowDefinitionApi(workflowId.value)
    const workflow = (response as any).data || response
    form.value = {
      id: workflow.id,
      name: workflow.name,
      code: workflow.code || '',
      description: workflow.description || '',
      entity_type: workflow.model_name || workflow.entity_type,
      is_active: workflow.is_active,
      states: workflow.states?.map((s: any) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        // Convert is_start/is_end to state_type for UI display
        state_type: s.is_start ? 'INITIAL' : (s.is_end ? 'TERMINAL' : (s.state_type || 'INTERMEDIATE')) as StateType,
        allow_edit: s.allow_edit ?? true,
        allow_delete: s.allow_delete ?? false,
        sla_hours: s.sla_hours,
        sequence: s.sequence ?? 0,
        entry_actions: s.entry_actions || [],
        exit_actions: s.exit_actions || [],
      })) || [],
      transitions: workflow.transitions?.map((t: any) => ({
        id: t.id,
        from_state_code: t.from_state || t.from_state_code,  // API returns from_state
        to_state_code: t.to_state || t.to_state_code,        // API returns to_state
        name: t.name,
        trigger_type: t.trigger_type || 'MANUAL',
        requires_approval: t.requires_approval || false,
        approval_chain_id: t.approval_chain_id,
        guards: t.guards || [],
        actions: t.actions || [],
      })) || [],
    }
  } catch {
    message.error('Failed to load workflow')
    router.push('/settings/workflows')
  } finally {
    loading.value = false
  }
}

const fetchApprovalChains = async () => {
  try {
    const response = await getApprovalChainsApi({ is_active: true } as any)
    approvalChains.value = (response as any).items || (response as any).data?.items || response || []
  } catch {
    // Silently fail - approval chains are optional
  }
}

// State CRUD
const openAddStateModal = () => {
  editingStateIndex.value = null
  stateForm.value = {
    code: '',
    name: '',
    state_type: 'INTERMEDIATE',
    allow_edit: true,
    allow_delete: false,
    sla_hours: undefined,
  }
  showStateModal.value = true
}

const openEditStateModal = (index: number) => {
  editingStateIndex.value = index
  const state = form.value.states[index]!
  stateForm.value = {
    code: state.code,
    name: state.name,
    state_type: state.state_type,
    allow_edit: state.allow_edit,
    allow_delete: state.allow_delete,
    sla_hours: state.sla_hours,
  }
  showStateModal.value = true
}

const saveState = () => {
  if (!stateForm.value.code.trim() || !stateForm.value.name.trim()) {
    message.error('State code and name are required')
    return
  }

  // Check for duplicate code
  const existingIndex = form.value.states.findIndex(s => s.code === stateForm.value.code)
  if (existingIndex !== -1 && existingIndex !== editingStateIndex.value) {
    message.error('State code must be unique')
    return
  }

  if (editingStateIndex.value !== null) {
    // Update existing state
    const oldCode = form.value.states[editingStateIndex.value]!.code
    form.value.states[editingStateIndex.value] = {
      ...form.value.states[editingStateIndex.value]!,
      ...stateForm.value,
    }
    // Update transitions if code changed
    if (oldCode !== stateForm.value.code) {
      form.value.transitions.forEach(t => {
        if (t.from_state_code === oldCode) t.from_state_code = stateForm.value.code
        if (t.to_state_code === oldCode) t.to_state_code = stateForm.value.code
      })
    }
  } else {
    // Add new state
    form.value.states.push({
      code: stateForm.value.code,
      name: stateForm.value.name,
      state_type: stateForm.value.state_type,
      allow_edit: stateForm.value.allow_edit,
      allow_delete: stateForm.value.allow_delete,
      sla_hours: stateForm.value.sla_hours,
      sequence: form.value.states.length,
      entry_actions: [],
      exit_actions: [],
    })
  }
  showStateModal.value = false
}

const deleteState = (index: number) => {
  const state = form.value.states[index]!
  // Check if state is used in transitions
  const usedInTransitions = form.value.transitions.some(
    t => t.from_state_code === state.code || t.to_state_code === state.code
  )
  if (usedInTransitions) {
    Modal.confirm({
      title: 'Delete State',
      content: `This state is used in transitions. Deleting it will also remove those transitions. Continue?`,
      okText: 'Delete',
      okType: 'danger',
      onOk() {
        form.value.transitions = form.value.transitions.filter(
          t => t.from_state_code !== state.code && t.to_state_code !== state.code
        )
        form.value.states.splice(index, 1)
        updateStateSequences()
      },
    })
  } else {
    form.value.states.splice(index, 1)
    updateStateSequences()
  }
}

const updateStateSequences = () => {
  form.value.states.forEach((s, i) => {
    s.sequence = i
  })
}

const moveState = (index: number, direction: 'up' | 'down') => {
  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= form.value.states.length) return
  const temp = form.value.states[index]!
  form.value.states[index] = form.value.states[newIndex]!
  form.value.states[newIndex] = temp
  updateStateSequences()
}

// Transition CRUD
const openAddTransitionModal = () => {
  editingTransitionIndex.value = null
  transitionForm.value = {
    from_state_code: '',
    to_state_code: '',
    name: '',
    trigger_type: 'MANUAL',
    requires_approval: false,
    approval_chain_id: undefined,
  }
  showTransitionModal.value = true
}

const openEditTransitionModal = (index: number) => {
  editingTransitionIndex.value = index
  const transition = form.value.transitions[index]!
  transitionForm.value = {
    from_state_code: transition.from_state_code,
    to_state_code: transition.to_state_code,
    name: transition.name,
    trigger_type: transition.trigger_type,
    requires_approval: transition.requires_approval,
    approval_chain_id: transition.approval_chain_id,
  }
  showTransitionModal.value = true
}

const saveTransition = () => {
  if (!transitionForm.value.from_state_code || !transitionForm.value.to_state_code || !transitionForm.value.name.trim()) {
    message.error('From state, to state, and name are required')
    return
  }

  if (transitionForm.value.from_state_code === transitionForm.value.to_state_code) {
    message.error('From and to states must be different')
    return
  }

  if (editingTransitionIndex.value !== null) {
    form.value.transitions[editingTransitionIndex.value] = {
      ...form.value.transitions[editingTransitionIndex.value]!,
      ...transitionForm.value,
    }
  } else {
    form.value.transitions.push({
      from_state_code: transitionForm.value.from_state_code,
      to_state_code: transitionForm.value.to_state_code,
      name: transitionForm.value.name,
      trigger_type: transitionForm.value.trigger_type,
      requires_approval: transitionForm.value.requires_approval,
      approval_chain_id: transitionForm.value.approval_chain_id,
      guards: [],
      actions: [],
    })
  }
  showTransitionModal.value = false
}

const deleteTransition = (index: number) => {
  form.value.transitions.splice(index, 1)
}

// Save workflow
const handleSubmit = async () => {
  if (hasValidationErrors.value.length > 0) {
    message.error(hasValidationErrors.value[0])
    return
  }

  saving.value = true
  try {
    // Transform state_type to is_start/is_end booleans for backend
    const statesData = form.value.states.map(s => ({
      code: s.code,
      name: s.name,
      sequence: s.sequence,
      is_start: s.state_type === 'INITIAL',
      is_end: s.state_type === 'TERMINAL',
    }))

    // Transform transitions for backend
    const transitionsData = form.value.transitions.map(t => ({
      from_state: t.from_state_code,
      to_state: t.to_state_code,
      name: t.name,
      code: t.name.toLowerCase().replace(/\s+/g, '_'),
      trigger_type: t.trigger_type,
      requires_approval: t.requires_approval,
      approval_chain_id: t.approval_chain_id || undefined,
      sequence: 0,
    }))

    if (isEdit.value) {
      // For edit, include states and transitions
      await updateWorkflowDefinitionApi(workflowId.value, {
        name: form.value.name,
        description: form.value.description || undefined,
        is_active: form.value.is_active,
        states: statesData,
        transitions: transitionsData,
      })
      message.success('Workflow updated successfully')
    } else {
      // For create, include states and transitions
      await createWorkflowDefinitionApi({
        name: form.value.name,
        code: form.value.code,
        model_name: form.value.entity_type,  // Backend expects model_name
        description: form.value.description || undefined,
        states: statesData,
        transitions: transitionsData,
      })
      message.success('Workflow created successfully')
    }
    router.push('/settings/workflows')
  } catch (err: any) {
    message.error(err.response?.data?.error || 'Failed to save workflow')
  } finally {
    saving.value = false
  }
}

// Watch for approval requirement changes
watch(() => transitionForm.value.requires_approval, (newVal) => {
  if (!newVal) {
    transitionForm.value.approval_chain_id = undefined
  }
})

onMounted(() => {
  fetchWorkflow()
  fetchApprovalChains()
})
</script>

<template>
  <div class="workflow-form-page">
    <Spin :spinning="loading">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <Button type="text" class="back-btn" @click="router.push('/settings/workflows')">
              <template #icon><ArrowLeftOutlined /></template>
            </Button>
            <div class="header-info">
              <h1 class="page-title">
                <BranchesOutlined />
                {{ isEdit ? 'Edit Workflow' : 'Create Workflow' }}
              </h1>
              <p class="page-subtitle">{{ isEdit ? 'Modify workflow configuration' : 'Configure a new document workflow' }}</p>
            </div>
          </div>
          <div class="header-actions">
            <Button size="large" @click="router.push('/settings/workflows')">Cancel</Button>
            <Button type="primary" size="large" :loading="saving" @click="handleSubmit">
              <template #icon><SaveOutlined /></template>
              {{ isEdit ? 'Save Changes' : 'Create Workflow' }}
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
              <h3 class="preview-title">Workflow Preview</h3>
              <Tag v-if="form.entity_type" :color="getEntityTypeColor(form.entity_type)">
                {{ getEntityTypeLabel(form.entity_type) }}
              </Tag>
            </div>

            <div class="preview-name">
              {{ form.name || 'Untitled Workflow' }}
            </div>
            <div class="preview-description">
              {{ form.description || 'No description' }}
            </div>

            <!-- Visual State Flow -->
            <div class="preview-flow">
              <h4 class="flow-title">
                <NodeIndexOutlined /> State Flow
              </h4>
              <div v-if="form.states.length === 0" class="empty-flow">
                No states defined yet
              </div>
              <div v-else class="flow-diagram">
                <template v-for="(state, index) in form.states" :key="state.code">
                  <div class="flow-state" :class="state.state_type.toLowerCase()">
                    <span class="state-label">{{ state.name }}</span>
                    <span class="state-type">{{ state.state_type }}</span>
                  </div>
                  <div v-if="index < form.states.length - 1" class="flow-connector">
                    <SwapRightOutlined />
                  </div>
                </template>
              </div>
            </div>

            <!-- Stats Summary -->
            <div class="preview-stats">
              <div class="stat-item">
                <NodeIndexOutlined />
                <span>{{ form.states.length }} States</span>
              </div>
              <div class="stat-item">
                <SwapRightOutlined />
                <span>{{ form.transitions.length }} Transitions</span>
              </div>
            </div>

            <div class="preview-status">
              <Tag :color="form.is_active ? 'success' : 'default'">
                <template #icon>
                  <CheckCircleOutlined v-if="form.is_active" />
                </template>
                {{ form.is_active ? 'Active' : 'Inactive' }}
              </Tag>
            </div>
          </div>

          <!-- Quick Tips -->
          <div class="tips-card">
            <h4 class="tips-title">
              <InfoCircleOutlined /> Quick Tips
            </h4>
            <ul class="tips-list">
              <li>Every workflow needs exactly one <strong>Initial</strong> state</li>
              <li>At least one <strong>Terminal</strong> state is required</li>
              <li>Use <strong>Intermediate</strong> states for in-progress stages</li>
              <li>Transitions define how documents move between states</li>
            </ul>
          </div>
        </div>

        <!-- Right Content - Form Tabs -->
        <div class="main-content">
          <Tabs v-model:activeKey="activeTab" class="form-tabs">
            <!-- Basic Info Tab -->
            <TabPane key="basic">
              <template #tab>
                <span><SettingOutlined /> Basic Info</span>
              </template>

              <div class="tab-content">
                <Form layout="vertical">
                  <Row :gutter="24">
                    <Col :span="12">
                      <FormItem label="Workflow Name" required>
                        <Input
                          v-model:value="form.name"
                          placeholder="Enter workflow name"
                          size="large"
                        />
                      </FormItem>
                    </Col>
                    <Col :span="12">
                      <FormItem label="Workflow Code" required>
                        <Input
                          v-model:value="form.code"
                          placeholder="e.g., sales_order_workflow"
                          size="large"
                          :disabled="isEdit"
                        />
                        <div class="field-hint">Unique identifier for this workflow (lowercase, underscores allowed)</div>
                      </FormItem>
                    </Col>
                  </Row>

                  <Row :gutter="24">
                    <Col :span="12">
                      <FormItem label="Entity Type" required>
                        <Select
                          v-model:value="form.entity_type"
                          placeholder="Select entity type"
                          size="large"
                          :disabled="isEdit"
                        >
                          <SelectOption v-for="type in entityTypes" :key="type.value" :value="type.value">
                            <div class="entity-option">
                              <span class="entity-dot" :style="{ backgroundColor: type.color }"></span>
                              {{ type.label }}
                            </div>
                          </SelectOption>
                        </Select>
                      </FormItem>
                    </Col>
                    <Col :span="12">
                      <!-- Placeholder for future field or keep empty for layout balance -->
                    </Col>
                  </Row>

                  <FormItem label="Description">
                    <Textarea
                      v-model:value="form.description"
                      placeholder="Describe what this workflow does..."
                      :rows="4"
                    />
                  </FormItem>

                  <FormItem label="Status">
                    <Switch v-model:checked="form.is_active" />
                    <span class="switch-label">{{ form.is_active ? 'Active' : 'Inactive' }}</span>
                  </FormItem>
                </Form>
              </div>
            </TabPane>

            <!-- States Tab -->
            <TabPane key="states">
              <template #tab>
                <span>
                  <NodeIndexOutlined /> States
                  <Badge :count="form.states.length" :number-style="{ backgroundColor: '#1890ff', marginLeft: '8px' }" />
                </span>
              </template>

              <div class="tab-content">
                <div class="tab-toolbar">
                  <div class="toolbar-info">
                    <Space>
                      <Tag color="green">{{ initialStatesCount }} Initial</Tag>
                      <Tag color="blue">{{ form.states.length - initialStatesCount - terminalStatesCount }} Intermediate</Tag>
                      <Tag color="red">{{ terminalStatesCount }} Terminal</Tag>
                    </Space>
                  </div>
                  <Button type="primary" @click="openAddStateModal">
                    <template #icon><PlusOutlined /></template>
                    Add State
                  </Button>
                </div>

                <div v-if="form.states.length === 0" class="empty-state">
                  <NodeIndexOutlined class="empty-icon" />
                  <h3>No States Defined</h3>
                  <p>Add states to define the stages of your workflow</p>
                  <Button type="primary" @click="openAddStateModal">
                    <template #icon><PlusOutlined /></template>
                    Add First State
                  </Button>
                </div>

                <div v-else class="states-list">
                  <div
                    v-for="(state, index) in form.states"
                    :key="state.code"
                    class="state-item"
                    :class="state.state_type.toLowerCase()"
                  >
                    <div class="state-drag">
                      <Space direction="vertical" :size="0">
                        <Button
                          type="text"
                          size="small"
                          :disabled="index === 0"
                          @click="moveState(index, 'up')"
                        >
                          <template #icon><DragOutlined style="transform: rotate(180deg)" /></template>
                        </Button>
                        <Button
                          type="text"
                          size="small"
                          :disabled="index === form.states.length - 1"
                          @click="moveState(index, 'down')"
                        >
                          <template #icon><DragOutlined /></template>
                        </Button>
                      </Space>
                    </div>
                    <div class="state-sequence">{{ index + 1 }}</div>
                    <div class="state-content">
                      <div class="state-header">
                        <span class="state-code">{{ state.code }}</span>
                        <Tag :color="getStateTypeColor(state.state_type)" size="small">
                          {{ state.state_type }}
                        </Tag>
                      </div>
                      <div class="state-name">{{ state.name }}</div>
                      <div class="state-meta">
                        <span v-if="state.sla_hours" class="meta-item">
                          <ClockCircleOutlined /> {{ state.sla_hours }}h SLA
                        </span>
                        <span v-if="state.allow_edit" class="meta-item">
                          <EditOutlined /> Editable
                        </span>
                        <span v-if="state.allow_delete" class="meta-item">
                          <DeleteOutlined /> Deletable
                        </span>
                      </div>
                    </div>
                    <div class="state-actions">
                      <Button type="text" @click="openEditStateModal(index)">
                        <template #icon><EditOutlined /></template>
                      </Button>
                      <Button type="text" danger @click="deleteState(index)">
                        <template #icon><DeleteOutlined /></template>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabPane>

            <!-- Transitions Tab -->
            <TabPane key="transitions">
              <template #tab>
                <span>
                  <SwapRightOutlined /> Transitions
                  <Badge :count="form.transitions.length" :number-style="{ backgroundColor: '#722ed1', marginLeft: '8px' }" />
                </span>
              </template>

              <div class="tab-content">
                <div class="tab-toolbar">
                  <div class="toolbar-info">
                    <span class="text-muted">Define how documents move between states</span>
                  </div>
                  <Button type="primary" @click="openAddTransitionModal" :disabled="form.states.length < 2">
                    <template #icon><PlusOutlined /></template>
                    Add Transition
                  </Button>
                </div>

                <div v-if="form.states.length < 2" class="empty-state warning">
                  <ExclamationCircleOutlined class="empty-icon" />
                  <h3>Need More States</h3>
                  <p>You need at least 2 states before you can create transitions</p>
                  <Button @click="activeTab = 'states'">Go to States Tab</Button>
                </div>

                <div v-else-if="form.transitions.length === 0" class="empty-state">
                  <SwapRightOutlined class="empty-icon" />
                  <h3>No Transitions Defined</h3>
                  <p>Add transitions to connect your workflow states</p>
                  <Button type="primary" @click="openAddTransitionModal">
                    <template #icon><PlusOutlined /></template>
                    Add First Transition
                  </Button>
                </div>

                <div v-else class="transitions-list">
                  <div v-for="(transition, index) in form.transitions" :key="index" class="transition-item">
                    <div class="transition-flow">
                      <div class="flow-from">
                        <span class="flow-label">From</span>
                        <Tag color="blue">{{ transition.from_state_code }}</Tag>
                      </div>
                      <div class="flow-arrow">
                        <SwapRightOutlined />
                      </div>
                      <div class="flow-to">
                        <span class="flow-label">To</span>
                        <Tag color="green">{{ transition.to_state_code }}</Tag>
                      </div>
                    </div>
                    <div class="transition-content">
                      <div class="transition-name">{{ transition.name }}</div>
                      <div class="transition-meta">
                        <Tag :color="triggerTypes.find(t => t.value === transition.trigger_type)?.color || 'default'">
                          {{ transition.trigger_type }}
                        </Tag>
                        <Tag v-if="transition.requires_approval" color="orange">
                          <CheckCircleOutlined /> Approval Required
                        </Tag>
                      </div>
                    </div>
                    <div class="transition-actions">
                      <Button type="text" @click="openEditTransitionModal(index)">
                        <template #icon><EditOutlined /></template>
                      </Button>
                      <Button type="text" danger @click="deleteTransition(index)">
                        <template #icon><DeleteOutlined /></template>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabPane>
          </Tabs>
        </div>
      </div>
    </Spin>

    <!-- State Modal -->
    <Modal
      v-model:open="showStateModal"
      :title="editingStateIndex !== null ? 'Edit State' : 'Add State'"
      @ok="saveState"
      :ok-text="editingStateIndex !== null ? 'Save Changes' : 'Add State'"
      width="500px"
    >
      <Form layout="vertical" class="modal-form">
        <Row :gutter="16">
          <Col :span="12">
            <FormItem label="State Code" required>
              <Input
                v-model:value="stateForm.code"
                placeholder="e.g., DRAFT, PENDING"
                :disabled="editingStateIndex !== null"
              />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="State Name" required>
              <Input v-model:value="stateForm.name" placeholder="e.g., Draft, Pending Approval" />
            </FormItem>
          </Col>
        </Row>

        <FormItem label="State Type" required>
          <RadioGroup v-model:value="stateForm.state_type" button-style="solid">
            <RadioButton v-for="type in stateTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </RadioButton>
          </RadioGroup>
          <div class="type-hint">
            <template v-if="stateForm.state_type === 'INITIAL'">
              Starting state for new documents. Only one initial state allowed.
            </template>
            <template v-else-if="stateForm.state_type === 'TERMINAL'">
              Final state. Documents cannot transition out of terminal states.
            </template>
            <template v-else>
              In-progress state. Documents can transition in and out.
            </template>
          </div>
        </FormItem>

        <FormItem label="SLA Hours">
          <InputNumber
            v-model:value="stateForm.sla_hours"
            placeholder="Optional"
            :min="0"
            style="width: 100%"
          />
          <div class="field-hint">Maximum time a document should stay in this state</div>
        </FormItem>

        <Row :gutter="16">
          <Col :span="12">
            <FormItem>
              <Checkbox v-model:checked="stateForm.allow_edit">Allow editing in this state</Checkbox>
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem>
              <Checkbox v-model:checked="stateForm.allow_delete">Allow deletion in this state</Checkbox>
            </FormItem>
          </Col>
        </Row>
      </Form>
    </Modal>

    <!-- Transition Modal -->
    <Modal
      v-model:open="showTransitionModal"
      :title="editingTransitionIndex !== null ? 'Edit Transition' : 'Add Transition'"
      @ok="saveTransition"
      :ok-text="editingTransitionIndex !== null ? 'Save Changes' : 'Add Transition'"
      width="500px"
    >
      <Form layout="vertical" class="modal-form">
        <Row :gutter="16">
          <Col :span="11">
            <FormItem label="From State" required>
              <Select
                v-model:value="transitionForm.from_state_code"
                placeholder="Select state"
              >
                <SelectOption v-for="state in availableStateCodes" :key="state.value" :value="state.value">
                  {{ state.label }}
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="2" class="arrow-col">
            <SwapRightOutlined class="form-arrow" />
          </Col>
          <Col :span="11">
            <FormItem label="To State" required>
              <Select
                v-model:value="transitionForm.to_state_code"
                placeholder="Select state"
              >
                <SelectOption v-for="state in availableStateCodes" :key="state.value" :value="state.value">
                  {{ state.label }}
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
        </Row>

        <FormItem label="Transition Name" required>
          <Input v-model:value="transitionForm.name" placeholder="e.g., Submit for Approval, Approve" />
        </FormItem>

        <FormItem label="Trigger Type" required>
          <RadioGroup v-model:value="transitionForm.trigger_type" button-style="solid">
            <RadioButton v-for="type in triggerTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </RadioButton>
          </RadioGroup>
        </FormItem>

        <FormItem>
          <Checkbox v-model:checked="transitionForm.requires_approval">
            Requires Approval
          </Checkbox>
        </FormItem>

        <FormItem v-if="transitionForm.requires_approval" label="Approval Chain">
          <Select
            v-model:value="transitionForm.approval_chain_id"
            placeholder="Select approval chain"
            allow-clear
          >
            <SelectOption v-for="chain in approvalChains" :key="chain.id" :value="chain.id">
              {{ chain.name }}
            </SelectOption>
          </Select>
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>

<script lang="ts">
export default {
  name: 'WorkflowFormPage',
}
</script>

<style scoped>
.workflow-form-page {
  min-height: calc(100vh - 64px);
  background: #f5f5f5;
}

.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px 32px;
  color: #fff;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  color: rgba(255, 255, 255, 0.85);
  font-size: 18px;
}

.back-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-subtitle {
  margin: 4px 0 0;
  opacity: 0.85;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.validation-banner {
  padding: 16px 32px;
  max-width: 1400px;
  margin: 0 auto;
}

.error-list {
  margin: 8px 0 0;
  padding-left: 20px;
}

.form-layout {
  display: flex;
  gap: 24px;
  padding: 24px 32px;
  max-width: 1400px;
  margin: 0 auto;
}

.sidebar {
  width: 320px;
  flex-shrink: 0;
}

.preview-card, .tips-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tips-card {
  margin-top: 16px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.preview-title, .tips-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #8c8c8c;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-name {
  font-size: 20px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.preview-description {
  font-size: 13px;
  color: #8c8c8c;
  margin-bottom: 20px;
}

.preview-flow {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.flow-title {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 600;
  color: #8c8c8c;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
}

.empty-flow {
  text-align: center;
  color: #bfbfbf;
  font-size: 13px;
  padding: 16px;
}

.flow-diagram {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0;
}

.flow-state {
  padding: 8px 12px;
  border-radius: 6px;
  text-align: center;
  min-width: 80px;
}

.flow-state.initial {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}

.flow-state.intermediate {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
}

.flow-state.terminal {
  background: #fff1f0;
  border: 1px solid #ffa39e;
}

.flow-state .state-label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: #262626;
}

.flow-state .state-type {
  display: block;
  font-size: 9px;
  color: #8c8c8c;
  text-transform: uppercase;
}

.flow-connector {
  color: #bfbfbf;
  font-size: 14px;
}

.preview-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
}

.preview-stats .stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #595959;
}

.preview-status {
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.tips-list {
  margin: 12px 0 0;
  padding-left: 16px;
  font-size: 13px;
  color: #595959;
}

.tips-list li {
  margin-bottom: 8px;
}

.main-content {
  flex: 1;
  min-width: 0;
}

.form-tabs {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.form-tabs :deep(.ant-tabs-nav) {
  padding: 0 24px;
  margin-bottom: 0;
}

.tab-content {
  padding: 24px;
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

.switch-label {
  margin-left: 12px;
  color: #595959;
}

.tab-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.toolbar-info {
  color: #8c8c8c;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  background: #fafafa;
  border-radius: 8px;
}

.empty-state.warning {
  background: #fffbe6;
}

.empty-icon {
  font-size: 48px;
  color: #bfbfbf;
  margin-bottom: 16px;
}

.empty-state.warning .empty-icon {
  color: #faad14;
}

.empty-state h3 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 500;
  color: #262626;
}

.empty-state p {
  margin: 0 0 20px;
  color: #8c8c8c;
}

.states-list, .transitions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.state-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  transition: all 0.2s;
}

.state-item:hover {
  border-color: #d9d9d9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.state-item.initial {
  border-left: 4px solid #52c41a;
}

.state-item.intermediate {
  border-left: 4px solid #1890ff;
}

.state-item.terminal {
  border-left: 4px solid #f5222d;
}

.state-drag {
  color: #bfbfbf;
}

.state-sequence {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #8c8c8c;
}

.state-content {
  flex: 1;
}

.state-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.state-code {
  font-family: monospace;
  font-size: 12px;
  color: #8c8c8c;
}

.state-name {
  font-weight: 500;
  color: #262626;
}

.state-meta {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.meta-item {
  font-size: 12px;
  color: #8c8c8c;
  display: flex;
  align-items: center;
  gap: 4px;
}

.state-actions {
  display: flex;
  gap: 4px;
}

.transition-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  transition: all 0.2s;
}

.transition-item:hover {
  border-color: #d9d9d9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.transition-flow {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 200px;
}

.flow-from, .flow-to {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.flow-label {
  font-size: 10px;
  color: #bfbfbf;
  text-transform: uppercase;
}

.flow-arrow {
  color: #bfbfbf;
  font-size: 18px;
}

.transition-content {
  flex: 1;
}

.transition-name {
  font-weight: 500;
  color: #262626;
  margin-bottom: 8px;
}

.transition-meta {
  display: flex;
  gap: 8px;
}

.transition-actions {
  display: flex;
  gap: 4px;
}

.text-muted {
  color: #8c8c8c;
}

/* Modal styles */
.modal-form {
  padding-top: 8px;
}

.type-hint, .field-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #8c8c8c;
}

.arrow-col {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 32px;
}

.form-arrow {
  font-size: 20px;
  color: #bfbfbf;
}
</style>
