<script setup>
import { ref, computed, onMounted, watch, defineProps, defineEmits } from 'vue'
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
import { message, Modal } from 'ant-design-vue'
import {
  getWorkflowDefinitionApi,
  createWorkflowDefinitionApi,
  updateWorkflowDefinitionApi,
  getApprovalChainsApi,
} from '#/api/base_automation'

const props = defineProps({
  workflowId: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['back', 'saved'])

const isEdit = computed(() => !!props.workflowId)

const loading = ref(false)
const saving = ref(false)
const activeTab = ref('basic')
const approvalChains = ref([])

const form = ref({
  id: '',
  name: '',
  code: '',
  description: '',
  model_name: '',
  state_field: 'state',
  default_state: '',
  is_active: true,
  states: [],
  transitions: [],
})

// State editor modal
const showStateModal = ref(false)
const editingStateIndex = ref(null)
const stateForm = ref({
  code: '',
  name: '',
  is_start: false,
  is_end: false,
  color: '#1890ff',
  sla_hours: undefined,
  sequence: 10,
})

// Transition editor modal
const showTransitionModal = ref(false)
const editingTransitionIndex = ref(null)
const transitionForm = ref({
  from_state: '',
  to_state: '',
  name: '',
  code: '',
  button_name: '',
  button_class: 'btn-primary',
  requires_approval: false,
  approval_chain_id: undefined,
  sequence: 10,
})

const entityTypes = [
  { value: 'hr.leave', label: 'Leave Request', color: '#52c41a' },
  { value: 'hr.expense', label: 'Expense', color: '#1890ff' },
  { value: 'hr.travel', label: 'Travel Request', color: '#722ed1' },
  { value: 'hr.loan', label: 'Loan Request', color: '#fa8c16' },
  { value: 'hr.overtime', label: 'Overtime', color: '#13c2c2' },
  { value: 'purchase.order', label: 'Purchase Order', color: '#eb2f96' },
  { value: 'project.project', label: 'Project', color: '#faad14' },
  { value: 'project.task', label: 'Task', color: '#2f54eb' },
]

const stateTypes = [
  { value: 'initial', label: 'Initial', color: '#52c41a' },
  { value: 'intermediate', label: 'Intermediate', color: '#1890ff' },
  { value: 'terminal', label: 'Terminal', color: '#f5222d' },
]

const buttonStyles = [
  { value: 'btn-primary', label: 'Primary' },
  { value: 'btn-success', label: 'Success' },
  { value: 'btn-warning', label: 'Warning' },
  { value: 'btn-danger', label: 'Danger' },
  { value: 'btn-default', label: 'Default' },
]

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

const availableStateCodes = computed(() => {
  return form.value.states.map(s => ({ value: s.code, label: `${s.name} (${s.code})` }))
})

const initialStatesCount = computed(() => form.value.states.filter(s => s.is_start).length)
const terminalStatesCount = computed(() => form.value.states.filter(s => s.is_end).length)

const hasValidationErrors = computed(() => {
  const errors = []
  if (!form.value.name.trim()) errors.push('Workflow name is required')
  if (!form.value.code.trim()) errors.push('Workflow code is required')
  if (!form.value.model_name) errors.push('Model name is required')
  if (form.value.states.length === 0) errors.push('At least one state is required')
  if (initialStatesCount.value !== 1) errors.push('Exactly one initial state is required')
  if (terminalStatesCount.value === 0) errors.push('At least one terminal state is required')
  return errors
})

const fetchWorkflow = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const workflow = await getWorkflowDefinitionApi(props.workflowId)
    form.value = {
      id: workflow.id,
      name: workflow.name,
      code: workflow.code || '',
      description: workflow.description || '',
      model_name: workflow.model_name,
      state_field: workflow.state_field || 'state',
      default_state: workflow.default_state || '',
      is_active: workflow.is_active,
      states: workflow.states?.map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
        is_start: s.is_start,
        is_end: s.is_end,
        color: s.color || '#1890ff',
        sla_hours: s.sla_hours,
        sequence: s.sequence,
      })) || [],
      transitions: workflow.transitions?.map(t => ({
        id: t.id,
        from_state: t.from_state,
        to_state: t.to_state,
        name: t.name,
        code: t.code,
        button_name: t.button_name,
        button_class: t.button_class,
        requires_approval: t.requires_approval,
        approval_chain_id: t.approval_chain_id,
        sequence: t.sequence,
      })) || [],
    }
  } catch (e) {
    message.error('Failed to load workflow')
    emit('back')
  } finally {
    loading.value = false
  }
}

const fetchApprovalChains = async () => {
  try {
    const response = await getApprovalChainsApi({ page_size: 100, is_active: true })
    approvalChains.value = response.items || []
  } catch (e) {
    // Silently fail - approval chains are optional
  }
}

// State CRUD
const openAddStateModal = () => {
  editingStateIndex.value = null
  stateForm.value = {
    code: '',
    name: '',
    is_start: false,
    is_end: false,
    color: '#1890ff',
    sla_hours: undefined,
    sequence: (form.value.states.length + 1) * 10,
  }
  showStateModal.value = true
}

const openEditStateModal = (index) => {
  editingStateIndex.value = index
  const state = form.value.states[index]
  stateForm.value = {
    code: state.code,
    name: state.name,
    is_start: state.is_start,
    is_end: state.is_end,
    color: state.color,
    sla_hours: state.sla_hours,
    sequence: state.sequence,
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
    const oldCode = form.value.states[editingStateIndex.value].code
    form.value.states[editingStateIndex.value] = {
      ...form.value.states[editingStateIndex.value],
      ...stateForm.value,
    }
    // Update transitions if code changed
    if (oldCode !== stateForm.value.code) {
      form.value.transitions.forEach(t => {
        if (t.from_state === oldCode) t.from_state = stateForm.value.code
        if (t.to_state === oldCode) t.to_state = stateForm.value.code
      })
    }
  } else {
    // Add new state
    form.value.states.push({ ...stateForm.value })
  }
  showStateModal.value = false
}

const deleteState = (index) => {
  const state = form.value.states[index]
  // Check if state is used in transitions
  const usedInTransitions = form.value.transitions.some(
    t => t.from_state === state.code || t.to_state === state.code
  )
  if (usedInTransitions) {
    Modal.confirm({
      title: 'Delete State',
      content: `This state is used in transitions. Deleting it will also remove those transitions. Continue?`,
      okText: 'Delete',
      okType: 'danger',
      onOk() {
        form.value.transitions = form.value.transitions.filter(
          t => t.from_state !== state.code && t.to_state !== state.code
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
    s.sequence = (i + 1) * 10
  })
}

const moveState = (index, direction) => {
  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= form.value.states.length) return
  const temp = form.value.states[index]
  form.value.states[index] = form.value.states[newIndex]
  form.value.states[newIndex] = temp
  updateStateSequences()
}

// Transition CRUD
const openAddTransitionModal = () => {
  editingTransitionIndex.value = null
  transitionForm.value = {
    from_state: '',
    to_state: '',
    name: '',
    code: '',
    button_name: '',
    button_class: 'btn-primary',
    requires_approval: false,
    approval_chain_id: undefined,
    sequence: (form.value.transitions.length + 1) * 10,
  }
  showTransitionModal.value = true
}

const openEditTransitionModal = (index) => {
  editingTransitionIndex.value = index
  const transition = form.value.transitions[index]
  transitionForm.value = {
    from_state: transition.from_state,
    to_state: transition.to_state,
    name: transition.name,
    code: transition.code,
    button_name: transition.button_name,
    button_class: transition.button_class,
    requires_approval: transition.requires_approval,
    approval_chain_id: transition.approval_chain_id,
    sequence: transition.sequence,
  }
  showTransitionModal.value = true
}

const saveTransition = () => {
  if (!transitionForm.value.from_state || !transitionForm.value.to_state || !transitionForm.value.name.trim()) {
    message.error('From state, to state, and name are required')
    return
  }

  if (transitionForm.value.from_state === transitionForm.value.to_state) {
    message.error('From and to states must be different')
    return
  }

  if (editingTransitionIndex.value !== null) {
    form.value.transitions[editingTransitionIndex.value] = {
      ...form.value.transitions[editingTransitionIndex.value],
      ...transitionForm.value,
    }
  } else {
    form.value.transitions.push({ ...transitionForm.value })
  }
  showTransitionModal.value = false
}

const deleteTransition = (index) => {
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
    const data = {
      name: form.value.name,
      code: form.value.code,
      description: form.value.description || undefined,
      model_name: form.value.model_name,
      state_field: form.value.state_field,
      default_state: form.value.default_state || form.value.states.find(s => s.is_start)?.code,
      is_active: form.value.is_active,
      states: form.value.states.map(s => ({
        code: s.code,
        name: s.name,
        is_start: s.is_start,
        is_end: s.is_end,
        color: s.color,
        sla_hours: s.sla_hours,
        sequence: s.sequence,
      })),
      transitions: form.value.transitions.map(t => ({
        from_state: t.from_state,
        to_state: t.to_state,
        name: t.name,
        code: t.code,
        button_name: t.button_name,
        button_class: t.button_class,
        requires_approval: t.requires_approval,
        approval_chain_id: t.approval_chain_id || undefined,
        sequence: t.sequence,
      })),
    }

    console.log('Submitting data:', JSON.stringify(data, null, 2))
    console.log('Transitions in data:', data.transitions)

    if (isEdit.value) {
      // Use the code from the loaded form data (more reliable than prop)
      await updateWorkflowDefinitionApi(form.value.code || props.workflowId, data)
      message.success('Workflow updated successfully')
    } else {
      await createWorkflowDefinitionApi(data)
      message.success('Workflow created successfully')
    }
    emit('saved')
    emit('back')
  } catch (err) {
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
    <ASpin :spinning="loading">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <AButton type="text" class="back-btn" @click="emit('back')">
              <template #icon><ArrowLeftOutlined /></template>
            </AButton>
            <div class="header-info">
              <h1 class="page-title">
                <BranchesOutlined />
                {{ isEdit ? 'Edit Workflow' : 'Create Workflow' }}
              </h1>
              <p class="page-subtitle">{{ isEdit ? 'Modify workflow configuration' : 'Configure a new document workflow' }}</p>
            </div>
          </div>
          <div class="header-actions">
            <AButton size="large" @click="emit('back')">Cancel</AButton>
            <AButton type="primary" size="large" :loading="saving" @click="handleSubmit">
              <template #icon><SaveOutlined /></template>
              {{ isEdit ? 'Save Changes' : 'Create Workflow' }}
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
              <h3 class="preview-title">Workflow Preview</h3>
              <ATag v-if="form.model_name" :color="getEntityTypeColor(form.model_name)">
                {{ getEntityTypeLabel(form.model_name) }}
              </ATag>
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
                  <div class="flow-state" :class="getStateTypeClass(state)">
                    <span class="state-label">{{ state.name }}</span>
                    <span class="state-type">{{ getStateTypeLabel(state) }}</span>
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
              <ATag :color="form.is_active ? 'success' : 'default'">
                <template #icon>
                  <CheckCircleOutlined v-if="form.is_active" />
                </template>
                {{ form.is_active ? 'Active' : 'Inactive' }}
              </ATag>
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
          <ATabs v-model:activeKey="activeTab" class="form-tabs">
            <!-- Basic Info Tab -->
            <ATabPane key="basic">
              <template #tab>
                <span><SettingOutlined /> Basic Info</span>
              </template>

              <div class="tab-content">
                <AForm layout="vertical">
                  <ARow :gutter="24">
                    <ACol :span="12">
                      <AFormItem label="Workflow Name" required>
                        <AInput
                          v-model:value="form.name"
                          placeholder="Enter workflow name"
                          size="large"
                        />
                      </AFormItem>
                    </ACol>
                    <ACol :span="12">
                      <AFormItem label="Code" required>
                        <AInput
                          v-model:value="form.code"
                          placeholder="workflow_code"
                          size="large"
                          :disabled="isEdit"
                        />
                      </AFormItem>
                    </ACol>
                  </ARow>

                  <ARow :gutter="24">
                    <ACol :span="12">
                      <AFormItem label="Model Name" required>
                        <ASelect
                          v-model:value="form.model_name"
                          placeholder="Select model"
                          size="large"
                          :disabled="isEdit"
                        >
                          <ASelectOption v-for="type in entityTypes" :key="type.value" :value="type.value">
                            <div class="entity-option">
                              <span class="entity-dot" :style="{ backgroundColor: type.color }"></span>
                              {{ type.label }}
                            </div>
                          </ASelectOption>
                        </ASelect>
                      </AFormItem>
                    </ACol>
                    <ACol :span="12">
                      <AFormItem label="State Field">
                        <AInput
                          v-model:value="form.state_field"
                          placeholder="state"
                          size="large"
                        />
                      </AFormItem>
                    </ACol>
                  </ARow>

                  <AFormItem label="Description">
                    <ATextarea
                      v-model:value="form.description"
                      placeholder="Describe what this workflow does..."
                      :rows="4"
                    />
                  </AFormItem>

                  <AFormItem label="Status">
                    <ASwitch v-model:checked="form.is_active" />
                    <span class="switch-label">{{ form.is_active ? 'Active' : 'Inactive' }}</span>
                  </AFormItem>
                </AForm>
              </div>
            </ATabPane>

            <!-- States Tab -->
            <ATabPane key="states">
              <template #tab>
                <span>
                  <NodeIndexOutlined /> States
                  <ABadge :count="form.states.length" :number-style="{ backgroundColor: '#1890ff', marginLeft: '8px' }" />
                </span>
              </template>

              <div class="tab-content">
                <div class="tab-toolbar">
                  <div class="toolbar-info">
                    <ASpace>
                      <ATag color="green">{{ initialStatesCount }} Initial</ATag>
                      <ATag color="blue">{{ form.states.length - initialStatesCount - terminalStatesCount }} Intermediate</ATag>
                      <ATag color="red">{{ terminalStatesCount }} Terminal</ATag>
                    </ASpace>
                  </div>
                  <AButton type="primary" @click="openAddStateModal">
                    <template #icon><PlusOutlined /></template>
                    Add State
                  </AButton>
                </div>

                <div v-if="form.states.length === 0" class="empty-state">
                  <NodeIndexOutlined class="empty-icon" />
                  <h3>No States Defined</h3>
                  <p>Add states to define the stages of your workflow</p>
                  <AButton type="primary" @click="openAddStateModal">
                    <template #icon><PlusOutlined /></template>
                    Add First State
                  </AButton>
                </div>

                <div v-else class="states-list">
                  <div
                    v-for="(state, index) in form.states"
                    :key="state.code"
                    class="state-item"
                    :class="getStateTypeClass(state)"
                  >
                    <div class="state-drag">
                      <ASpace direction="vertical" :size="0">
                        <AButton
                          type="text"
                          size="small"
                          :disabled="index === 0"
                          @click="moveState(index, 'up')"
                        >
                          <template #icon><DragOutlined style="transform: rotate(180deg)" /></template>
                        </AButton>
                        <AButton
                          type="text"
                          size="small"
                          :disabled="index === form.states.length - 1"
                          @click="moveState(index, 'down')"
                        >
                          <template #icon><DragOutlined /></template>
                        </AButton>
                      </ASpace>
                    </div>
                    <div class="state-sequence">{{ index + 1 }}</div>
                    <div class="state-content">
                      <div class="state-header">
                        <span class="state-code">{{ state.code }}</span>
                        <ATag :color="getStateTypeColor(state)" size="small">
                          {{ getStateTypeLabel(state) }}
                        </ATag>
                      </div>
                      <div class="state-name">{{ state.name }}</div>
                      <div class="state-meta">
                        <span v-if="state.sla_hours" class="meta-item">
                          <ClockCircleOutlined /> {{ state.sla_hours }}h SLA
                        </span>
                      </div>
                    </div>
                    <div class="state-actions">
                      <AButton type="text" @click="openEditStateModal(index)">
                        <template #icon><EditOutlined /></template>
                      </AButton>
                      <AButton type="text" danger @click="deleteState(index)">
                        <template #icon><DeleteOutlined /></template>
                      </AButton>
                    </div>
                  </div>
                </div>
              </div>
            </ATabPane>

            <!-- Transitions Tab -->
            <ATabPane key="transitions">
              <template #tab>
                <span>
                  <SwapRightOutlined /> Transitions
                  <ABadge :count="form.transitions.length" :number-style="{ backgroundColor: '#722ed1', marginLeft: '8px' }" />
                </span>
              </template>

              <div class="tab-content">
                <div class="tab-toolbar">
                  <div class="toolbar-info">
                    <span class="text-muted">Define how documents move between states</span>
                  </div>
                  <AButton type="primary" @click="openAddTransitionModal" :disabled="form.states.length < 2">
                    <template #icon><PlusOutlined /></template>
                    Add Transition
                  </AButton>
                </div>

                <div v-if="form.states.length < 2" class="empty-state warning">
                  <ExclamationCircleOutlined class="empty-icon" />
                  <h3>Need More States</h3>
                  <p>You need at least 2 states before you can create transitions</p>
                  <AButton @click="activeTab = 'states'">Go to States Tab</AButton>
                </div>

                <div v-else-if="form.transitions.length === 0" class="empty-state">
                  <SwapRightOutlined class="empty-icon" />
                  <h3>No Transitions Defined</h3>
                  <p>Add transitions to connect your workflow states</p>
                  <AButton type="primary" @click="openAddTransitionModal">
                    <template #icon><PlusOutlined /></template>
                    Add First Transition
                  </AButton>
                </div>

                <div v-else class="transitions-list">
                  <div v-for="(transition, index) in form.transitions" :key="index" class="transition-item">
                    <div class="transition-flow">
                      <div class="flow-from">
                        <span class="flow-label">From</span>
                        <ATag color="blue">{{ transition.from_state }}</ATag>
                      </div>
                      <div class="flow-arrow">
                        <SwapRightOutlined />
                      </div>
                      <div class="flow-to">
                        <span class="flow-label">To</span>
                        <ATag color="green">{{ transition.to_state }}</ATag>
                      </div>
                    </div>
                    <div class="transition-content">
                      <div class="transition-name">{{ transition.name }}</div>
                      <div class="transition-meta">
                        <ATag v-if="transition.button_name" color="default">
                          {{ transition.button_name }}
                        </ATag>
                        <ATag v-if="transition.requires_approval" color="orange">
                          <CheckCircleOutlined /> Approval Required
                        </ATag>
                      </div>
                    </div>
                    <div class="transition-actions">
                      <AButton type="text" @click="openEditTransitionModal(index)">
                        <template #icon><EditOutlined /></template>
                      </AButton>
                      <AButton type="text" danger @click="deleteTransition(index)">
                        <template #icon><DeleteOutlined /></template>
                      </AButton>
                    </div>
                  </div>
                </div>
              </div>
            </ATabPane>
          </ATabs>
        </div>
      </div>
    </ASpin>

    <!-- State Modal -->
    <AModal
      v-model:open="showStateModal"
      :title="editingStateIndex !== null ? 'Edit State' : 'Add State'"
      @ok="saveState"
      :ok-text="editingStateIndex !== null ? 'Save Changes' : 'Add State'"
      width="500px"
    >
      <AForm layout="vertical" class="modal-form">
        <ARow :gutter="16">
          <ACol :span="12">
            <AFormItem label="State Code" required>
              <AInput
                v-model:value="stateForm.code"
                placeholder="e.g., draft, pending"
                :disabled="editingStateIndex !== null"
              />
            </AFormItem>
          </ACol>
          <ACol :span="12">
            <AFormItem label="State Name" required>
              <AInput v-model:value="stateForm.name" placeholder="e.g., Draft, Pending Approval" />
            </AFormItem>
          </ACol>
        </ARow>

        <ARow :gutter="16">
          <ACol :span="12">
            <AFormItem>
              <ACheckbox v-model:checked="stateForm.is_start">Initial State (Start)</ACheckbox>
            </AFormItem>
          </ACol>
          <ACol :span="12">
            <AFormItem>
              <ACheckbox v-model:checked="stateForm.is_end">Terminal State (End)</ACheckbox>
            </AFormItem>
          </ACol>
        </ARow>

        <ARow :gutter="16">
          <ACol :span="12">
            <AFormItem label="Color">
              <AInput v-model:value="stateForm.color" type="color" />
            </AFormItem>
          </ACol>
          <ACol :span="12">
            <AFormItem label="SLA Hours">
              <AInputNumber
                v-model:value="stateForm.sla_hours"
                placeholder="Optional"
                :min="0"
                style="width: 100%"
              />
            </AFormItem>
          </ACol>
        </ARow>
      </AForm>
    </AModal>

    <!-- Transition Modal -->
    <AModal
      v-model:open="showTransitionModal"
      :title="editingTransitionIndex !== null ? 'Edit Transition' : 'Add Transition'"
      @ok="saveTransition"
      :ok-text="editingTransitionIndex !== null ? 'Save Changes' : 'Add Transition'"
      width="600px"
    >
      <AForm layout="vertical" class="modal-form">
        <ARow :gutter="16">
          <ACol :span="11">
            <AFormItem label="From State" required>
              <ASelect
                v-model:value="transitionForm.from_state"
                placeholder="Select state"
              >
                <ASelectOption v-for="state in availableStateCodes" :key="state.value" :value="state.value">
                  {{ state.label }}
                </ASelectOption>
              </ASelect>
            </AFormItem>
          </ACol>
          <ACol :span="2" class="arrow-col">
            <SwapRightOutlined class="form-arrow" />
          </ACol>
          <ACol :span="11">
            <AFormItem label="To State" required>
              <ASelect
                v-model:value="transitionForm.to_state"
                placeholder="Select state"
              >
                <ASelectOption v-for="state in availableStateCodes" :key="state.value" :value="state.value">
                  {{ state.label }}
                </ASelectOption>
              </ASelect>
            </AFormItem>
          </ACol>
        </ARow>

        <ARow :gutter="16">
          <ACol :span="12">
            <AFormItem label="Transition Name" required>
              <AInput v-model:value="transitionForm.name" placeholder="e.g., Submit for Approval" />
            </AFormItem>
          </ACol>
          <ACol :span="12">
            <AFormItem label="Code">
              <AInput v-model:value="transitionForm.code" placeholder="transition_code" />
            </AFormItem>
          </ACol>
        </ARow>

        <ARow :gutter="16">
          <ACol :span="12">
            <AFormItem label="Button Label">
              <AInput v-model:value="transitionForm.button_name" placeholder="Button text" />
            </AFormItem>
          </ACol>
          <ACol :span="12">
            <AFormItem label="Button Style">
              <ASelect v-model:value="transitionForm.button_class">
                <ASelectOption v-for="style in buttonStyles" :key="style.value" :value="style.value">
                  {{ style.label }}
                </ASelectOption>
              </ASelect>
            </AFormItem>
          </ACol>
        </ARow>

        <AFormItem>
          <ACheckbox v-model:checked="transitionForm.requires_approval">
            Requires Approval
          </ACheckbox>
        </AFormItem>

        <AFormItem v-if="transitionForm.requires_approval" label="Approval Chain">
          <ASelect
            v-model:value="transitionForm.approval_chain_id"
            placeholder="Select approval chain"
            allow-clear
          >
            <ASelectOption v-for="chain in approvalChains" :key="chain.id" :value="chain.id">
              {{ chain.name }}
            </ASelectOption>
          </ASelect>
        </AFormItem>
      </AForm>
    </AModal>
  </div>
</template>

<script>
export default {
  name: 'WorkflowFormPage',
}
</script>
