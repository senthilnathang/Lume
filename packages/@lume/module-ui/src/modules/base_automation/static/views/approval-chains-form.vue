<script setup>
import { ref, computed, onMounted, reactive, defineProps, defineEmits } from 'vue'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  TeamOutlined,
  UserOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  NumberOutlined,
} from '@ant-design/icons-vue'
import {
  Alert,
  Button,
  Card,
  Checkbox,
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
  Timeline,
  TimelineItem,
  TabPane,
  Textarea,
  FormItem,
  SelectOption,
} from 'ant-design-vue'
import {
  getApprovalChainApi,
  createApprovalChainApi,
  updateApprovalChainApi,
} from '#/api/base_automation'

const props = defineProps({
  chainId: {
    type: [String, Number],
    default: null,
  },
})

const emit = defineEmits(['back', 'saved'])

const isEdit = computed(() => !!props.chainId)

const loading = ref(false)
const saving = ref(false)
const activeTab = ref('basic')

const form = reactive({
  name: '',
  description: '',
  chain_type: 'SEQUENTIAL',
  is_active: true,
  steps: [],
})

// Step key counter for unique keys
let stepKeyCounter = 0

const chainTypeOptions = [
  { value: 'SEQUENTIAL', label: 'Sequential', description: 'Approvers review one after another', color: 'blue' },
  { value: 'PARALLEL', label: 'Parallel', description: 'All approvers review at the same time', color: 'green' },
  { value: 'ANY_ONE', label: 'Any One', description: 'First approver to respond decides', color: 'orange' },
]

const approverTypeOptions = [
  { value: 'USER', label: 'Specific User', icon: UserOutlined },
  { value: 'ROLE', label: 'Role', icon: TeamOutlined },
  { value: 'MANAGER', label: 'Reporting Manager', icon: UserOutlined },
  { value: 'DYNAMIC', label: 'Dynamic (Field-based)', icon: UserOutlined },
  { value: 'GROUP', label: 'Group', icon: TeamOutlined },
]

const getChainTypeConfig = (type) => {
  return chainTypeOptions.find(t => t.value === type) || chainTypeOptions[0]
}

const getApproverTypeLabel = (type) => {
  const opt = approverTypeOptions.find(t => t.value === type)
  return opt ? opt.label : type
}

const hasValidationErrors = computed(() => {
  const errors = []
  if (!form.name.trim()) errors.push('Chain name is required')
  if (!form.chain_type) errors.push('Chain type is required')
  if (form.steps.length === 0) errors.push('At least one approval step is required')
  return errors
})

const totalSLAHours = computed(() => {
  return form.steps.reduce((sum, step) => sum + (step.sla_hours || 0), 0)
})

const fetchChain = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const response = await getApprovalChainApi(props.chainId)
    const chainData = response.data || response
    form.name = chainData.name
    form.description = chainData.description || ''
    form.chain_type = chainData.chain_type
    form.is_active = chainData.is_active !== false
    form.steps = (chainData.steps || []).map(s => ({
      _key: ++stepKeyCounter,
      id: s.id,
      sequence: s.sequence,
      name: s.name,
      approver_type: s.approver_type,
      approver_id: s.approver_id,
      approver_role: s.approver_role,
      sla_hours: s.sla_hours || 24,
      can_delegate: s.can_delegate !== false,
      can_reassign: s.can_reassign || false,
    }))
  } catch (e) {
    message.error('Failed to load approval chain')
    emit('back')
  } finally {
    loading.value = false
  }
}

const addStep = () => {
  form.steps.push({
    _key: ++stepKeyCounter,
    sequence: form.steps.length + 1,
    name: `Step ${form.steps.length + 1}`,
    approver_type: 'USER',
    approver_id: null,
    approver_role: '',
    sla_hours: 24,
    can_delegate: true,
    can_reassign: false,
  })
}

const removeStep = (index) => {
  if (form.steps.length <= 1) {
    message.warning('At least one step is required')
    return
  }
  form.steps.splice(index, 1)
  // Resequence
  form.steps.forEach((s, i) => s.sequence = i + 1)
}

const moveStep = (index, direction) => {
  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= form.steps.length) return
  const temp = form.steps[index]
  form.steps[index] = form.steps[newIndex]
  form.steps[newIndex] = temp
  form.steps.forEach((s, i) => s.sequence = i + 1)
}

const handleSubmit = async () => {
  if (hasValidationErrors.value.length > 0) {
    message.error(hasValidationErrors.value[0])
    return
  }

  saving.value = true
  try {
    const payload = {
      name: form.name,
      description: form.description,
      chain_type: form.chain_type,
      is_active: form.is_active,
      steps: form.steps.map(s => ({
        sequence: s.sequence,
        name: s.name,
        approver_type: s.approver_type,
        approver_id: s.approver_id,
        approver_role: s.approver_role,
        sla_hours: s.sla_hours,
        can_delegate: s.can_delegate,
        can_reassign: s.can_reassign,
      })),
    }

    if (isEdit.value) {
      await updateApprovalChainApi(props.chainId, payload)
      message.success('Approval chain updated successfully')
    } else {
      await createApprovalChainApi(payload)
      message.success('Approval chain created successfully')
    }
    emit('saved')
    emit('back')
  } catch (err) {
    message.error(err.response?.data?.error?.message || 'Failed to save approval chain')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (isEdit.value) {
    fetchChain()
  } else {
    addStep()
  }
})
</script>

<template>
  <div class="approval-chain-form-page">
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
                <TeamOutlined />
                {{ isEdit ? 'Edit Approval Chain' : 'Create Approval Chain' }}
              </h1>
              <p class="page-subtitle">{{ isEdit ? 'Modify approval workflow configuration' : 'Configure a new multi-level approval workflow' }}</p>
            </div>
          </div>
          <div class="header-actions">
            <Button size="large" @click="emit('back')">Cancel</Button>
            <Button type="primary" size="large" :loading="saving" @click="handleSubmit">
              <template #icon><SaveOutlined /></template>
              {{ isEdit ? 'Save Changes' : 'Create Chain' }}
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
              <h3 class="preview-title">Chain Preview</h3>
              <Tag :color="getChainTypeConfig(form.chain_type).color">
                {{ getChainTypeConfig(form.chain_type).label }}
              </Tag>
            </div>

            <div class="preview-name">
              {{ form.name || 'Untitled Chain' }}
            </div>
            <div class="preview-description">
              {{ form.description || 'No description' }}
            </div>

            <!-- Visual Step Flow -->
            <div class="preview-flow">
              <h4 class="flow-title">
                <NumberOutlined /> Approval Steps
              </h4>
              <div v-if="form.steps.length === 0" class="empty-flow">
                No steps defined yet
              </div>
              <Timeline v-else>
                <TimelineItem v-for="step in form.steps" :key="step._key" color="blue">
                  <div class="step-preview">
                    <strong>{{ step.name }}</strong>
                    <div class="step-preview-meta">
                      <Tag size="small">{{ getApproverTypeLabel(step.approver_type) }}</Tag>
                      <span class="sla-badge">{{ step.sla_hours }}h SLA</span>
                    </div>
                  </div>
                </TimelineItem>
              </Timeline>
            </div>

            <!-- Stats Summary -->
            <div class="preview-stats">
              <div class="stat-item">
                <NumberOutlined />
                <span>{{ form.steps.length }} Steps</span>
              </div>
              <div class="stat-item">
                <CheckCircleOutlined />
                <span>{{ totalSLAHours }}h Total SLA</span>
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
              <li><strong>Sequential:</strong> Approvers review one after another in order</li>
              <li><strong>Parallel:</strong> All approvers review simultaneously</li>
              <li><strong>Any One:</strong> First response from any approver decides</li>
              <li>Set realistic SLA hours for each step</li>
            </ul>
          </div>
        </div>

        <!-- Right Content - Form Tabs -->
        <div class="main-content">
          <Tabs v-model:activeKey="activeTab" class="form-tabs">
            <!-- Basic Info Tab -->
            <TabPane key="basic">
              <template #tab>
                <span><TeamOutlined /> Basic Info</span>
              </template>

              <div class="tab-content">
                <Form layout="vertical">
                  <Row :gutter="24">
                    <Col :span="12">
                      <FormItem label="Chain Name" required>
                        <Input
                          v-model:value="form.name"
                          placeholder="e.g., High Value Order Approval"
                          size="large"
                        />
                      </FormItem>
                    </Col>
                    <Col :span="12">
                      <FormItem label="Chain Type" required>
                        <Select v-model:value="form.chain_type" size="large">
                          <SelectOption v-for="opt in chainTypeOptions" :key="opt.value" :value="opt.value">
                            <div class="chain-type-option">
                              <strong>{{ opt.label }}</strong>
                              <div class="option-desc">{{ opt.description }}</div>
                            </div>
                          </SelectOption>
                        </Select>
                      </FormItem>
                    </Col>
                  </Row>

                  <FormItem label="Description">
                    <Textarea
                      v-model:value="form.description"
                      placeholder="Describe when this approval chain should be used..."
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

            <!-- Steps Tab -->
            <TabPane key="steps">
              <template #tab>
                <span>
                  <NumberOutlined /> Approval Steps
                  <span class="tab-badge">{{ form.steps.length }}</span>
                </span>
              </template>

              <div class="tab-content">
                <div class="tab-toolbar">
                  <div class="toolbar-info">
                    <span class="text-muted">Define the approval steps in order</span>
                  </div>
                  <Button type="primary" @click="addStep">
                    <template #icon><PlusOutlined /></template>
                    Add Step
                  </Button>
                </div>

                <div v-if="form.steps.length === 0" class="empty-state">
                  <TeamOutlined class="empty-icon" />
                  <h3>No Steps Defined</h3>
                  <p>Add steps to define your approval workflow</p>
                  <Button type="primary" @click="addStep">
                    <template #icon><PlusOutlined /></template>
                    Add First Step
                  </Button>
                </div>

                <div v-else class="steps-list">
                  <div
                    v-for="(step, index) in form.steps"
                    :key="step._key"
                    class="step-item"
                  >
                    <div class="step-sequence">{{ step.sequence }}</div>
                    <div class="step-content">
                      <Card size="small">
                        <template #title>
                          <Input
                            v-model:value="step.name"
                            placeholder="Step name"
                            class="step-name-input"
                          />
                        </template>
                        <template #extra>
                          <Space>
                            <Button
                              type="text"
                              size="small"
                              :disabled="index === 0"
                              @click="moveStep(index, 'up')"
                            >
                              Up
                            </Button>
                            <Button
                              type="text"
                              size="small"
                              :disabled="index === form.steps.length - 1"
                              @click="moveStep(index, 'down')"
                            >
                              Down
                            </Button>
                            <Button
                              type="text"
                              danger
                              size="small"
                              @click="removeStep(index)"
                              :disabled="form.steps.length <= 1"
                            >
                              <template #icon><DeleteOutlined /></template>
                            </Button>
                          </Space>
                        </template>

                        <Row :gutter="16">
                          <Col :span="8">
                            <FormItem label="Approver Type">
                              <Select v-model:value="step.approver_type" size="small">
                                <SelectOption v-for="opt in approverTypeOptions" :key="opt.value" :value="opt.value">
                                  {{ opt.label }}
                                </SelectOption>
                              </Select>
                            </FormItem>
                          </Col>
                          <Col :span="8" v-if="step.approver_type === 'ROLE'">
                            <FormItem label="Role Name">
                              <Input v-model:value="step.approver_role" placeholder="e.g., MANAGER" size="small" />
                            </FormItem>
                          </Col>
                          <Col :span="8">
                            <FormItem label="SLA (Hours)">
                              <InputNumber
                                v-model:value="step.sla_hours"
                                :min="1"
                                :max="720"
                                style="width: 100%"
                                size="small"
                              />
                            </FormItem>
                          </Col>
                        </Row>

                        <Row :gutter="16">
                          <Col :span="24">
                            <FormItem label="Options" class="mb-0">
                              <Space>
                                <Checkbox v-model:checked="step.can_delegate">Can Delegate</Checkbox>
                                <Checkbox v-model:checked="step.can_reassign">Can Reassign</Checkbox>
                              </Space>
                            </FormItem>
                          </Col>
                        </Row>
                      </Card>
                    </div>
                  </div>
                </div>

                <div class="add-step-btn" v-if="form.steps.length > 0">
                  <Button type="dashed" block @click="addStep">
                    <template #icon><PlusOutlined /></template>
                    Add Another Step
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
  name: 'ApprovalChainFormPage',
}
</script>
