<script setup>
import { ref, computed, onMounted, reactive, defineProps, defineEmits, watch } from 'vue'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  UserAddOutlined,
  InfoCircleOutlined,
  TeamOutlined,
  UserOutlined,
  SyncOutlined,
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
  Spin,
  Switch,
  Tag,
  Textarea,
  FormItem,
  SelectOption,
} from 'ant-design-vue'
import {
  getAssignmentRuleApi,
  createAssignmentRuleApi,
  updateAssignmentRuleApi,
  ASSIGNMENT_TYPES,
  ASSIGNMENT_TRIGGERS,
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
  name: '',
  code: '',
  description: '',
  model_name: '',
  assignment_type: 'DIRECT_USER',
  trigger_on: 'CREATE',
  sequence: 10,
  is_active: true,
  // Type-specific config
  user_id: null,
  role_id: null,
  round_robin_group: '',
  lookup_field: '',
  expression: '',
  condition_domain: '',
})

const availableModels = [
  { value: 'Lead', label: 'Lead' },
  { value: 'Case', label: 'Case' },
  { value: 'Opportunity', label: 'Opportunity' },
  { value: 'Task', label: 'Task' },
  { value: 'Employee', label: 'Employee' },
]

const availableUsers = [
  { value: 1, label: 'John Smith' },
  { value: 2, label: 'Jane Doe' },
  { value: 3, label: 'Bob Wilson' },
  { value: 4, label: 'Alice Brown' },
]

const availableRoles = [
  { value: 1, label: 'Sales Rep' },
  { value: 2, label: 'Support Agent' },
  { value: 3, label: 'Manager' },
]

const assignmentTypeOptions = ASSIGNMENT_TYPES || [
  { value: 'DIRECT_USER', label: 'Direct User', description: 'Assign to a specific user', icon: UserOutlined },
  { value: 'LOAD_BASED', label: 'Load Based', description: 'Assign to user with fewest records', icon: TeamOutlined },
  { value: 'LOOKUP_FIELD', label: 'Lookup Field', description: 'Assign based on a field value', icon: UserOutlined },
  { value: 'EXPRESSION', label: 'Expression', description: 'Assign using a Python expression', icon: UserOutlined },
  { value: 'ROUND_ROBIN', label: 'Round Robin', description: 'Rotate through users in a group', icon: SyncOutlined },
]

const triggerOptions = ASSIGNMENT_TRIGGERS || [
  { value: 'CREATE', label: 'On Create' },
  { value: 'UPDATE', label: 'On Update' },
  { value: 'BOTH', label: 'On Create & Update' },
]

const getAssignmentTypeConfig = (type) => {
  return assignmentTypeOptions.find(t => t.value === type) || assignmentTypeOptions[0]
}

const hasValidationErrors = computed(() => {
  const errors = []
  if (!form.name.trim()) errors.push('Rule name is required')
  if (!form.model_name) errors.push('Model is required')
  return errors
})

const fetchRule = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const detail = await getAssignmentRuleApi(props.ruleId)
    Object.assign(form, {
      name: detail.name || '',
      code: detail.code || '',
      description: detail.description || '',
      model_name: detail.model_name || '',
      assignment_type: detail.assignment_type || 'DIRECT_USER',
      trigger_on: detail.trigger_on || 'CREATE',
      sequence: detail.sequence || 10,
      is_active: detail.is_active !== false,
      user_id: detail.user_id || null,
      role_id: detail.role_id || null,
      round_robin_group: detail.round_robin_group || '',
      lookup_field: detail.lookup_field || '',
      expression: detail.expression || '',
      condition_domain: detail.condition_domain
        ? JSON.stringify(detail.condition_domain, null, 2)
        : '',
    })
  } catch (e) {
    message.error('Failed to load assignment rule')
    emit('back')
  } finally {
    loading.value = false
  }
}

// Auto-generate code
watch(() => form.name, (newName) => {
  if (!isEdit.value && newName) {
    form.code = newName.toLowerCase().replace(/\s+/g, '_')
  }
})

const handleSubmit = async () => {
  if (hasValidationErrors.value.length > 0) {
    message.error(hasValidationErrors.value[0])
    return
  }

  saving.value = true
  try {
    const payload = {
      name: form.name,
      code: form.code || form.name.toLowerCase().replace(/\s+/g, '_'),
      description: form.description,
      model_name: form.model_name,
      assignment_type: form.assignment_type,
      trigger_on: form.trigger_on,
      sequence: form.sequence,
      is_active: form.is_active,
    }

    // Add type-specific fields
    if (form.assignment_type === 'DIRECT_USER') {
      payload.user_id = form.user_id
    } else if (form.assignment_type === 'LOAD_BASED' || form.assignment_type === 'LOOKUP_FIELD') {
      payload.role_id = form.role_id
      if (form.assignment_type === 'LOOKUP_FIELD') {
        payload.lookup_field = form.lookup_field
      }
    } else if (form.assignment_type === 'EXPRESSION') {
      payload.expression = form.expression
    } else if (form.assignment_type === 'ROUND_ROBIN') {
      payload.round_robin_group = form.round_robin_group
    }

    // Parse condition domain
    if (form.condition_domain) {
      try {
        payload.condition_domain = JSON.parse(form.condition_domain)
      } catch (e) {
        message.error('Invalid condition domain JSON')
        saving.value = false
        return
      }
    }

    if (isEdit.value) {
      await updateAssignmentRuleApi(props.ruleId, payload)
      message.success('Assignment rule updated')
    } else {
      await createAssignmentRuleApi(payload)
      message.success('Assignment rule created')
    }
    emit('saved')
    emit('back')
  } catch (err) {
    message.error(err.response?.data?.detail || 'Failed to save assignment rule')
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
  <div class="assignment-rule-form-page">
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
                <UserAddOutlined />
                {{ isEdit ? 'Edit Assignment Rule' : 'Create Assignment Rule' }}
              </h1>
              <p class="page-subtitle">{{ isEdit ? 'Modify assignment rule configuration' : 'Configure automatic record assignment' }}</p>
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

            <div class="preview-section">
              <h4 class="section-title">Assignment Type</h4>
              <Tag color="blue">{{ getAssignmentTypeConfig(form.assignment_type).label }}</Tag>
              <div class="type-description">
                {{ getAssignmentTypeConfig(form.assignment_type).description }}
              </div>
            </div>

            <div class="preview-section">
              <h4 class="section-title">Model & Trigger</h4>
              <Tag>{{ form.model_name || 'Not set' }}</Tag>
              <Tag color="purple">{{ form.trigger_on }}</Tag>
            </div>

            <div class="preview-section">
              <h4 class="section-title">Sequence</h4>
              <span>{{ form.sequence }} (lower runs first)</span>
            </div>
          </div>

          <!-- Quick Tips -->
          <div class="tips-card">
            <h4 class="tips-title">
              <InfoCircleOutlined /> Quick Tips
            </h4>
            <ul class="tips-list">
              <li><strong>Direct User:</strong> Always assigns to the same user</li>
              <li><strong>Load Based:</strong> Assigns to user with fewest records</li>
              <li><strong>Round Robin:</strong> Rotates through users in a group</li>
              <li>Lower sequence numbers run first</li>
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
                      placeholder="e.g., Assign New Leads to Sales"
                      size="large"
                    />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Code">
                    <Input
                      v-model:value="form.code"
                      placeholder="Auto-generated"
                      size="large"
                    />
                  </FormItem>
                </Col>
              </Row>

              <FormItem label="Description">
                <Textarea
                  v-model:value="form.description"
                  :rows="2"
                  placeholder="Describe this assignment rule"
                />
              </FormItem>

              <Row :gutter="24">
                <Col :span="8">
                  <FormItem label="Model" required>
                    <Select
                      v-model:value="form.model_name"
                      placeholder="Select model"
                      size="large"
                      :options="availableModels"
                    />
                  </FormItem>
                </Col>
                <Col :span="8">
                  <FormItem label="Assignment Type" required>
                    <Select v-model:value="form.assignment_type" size="large">
                      <SelectOption v-for="opt in assignmentTypeOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </SelectOption>
                    </Select>
                  </FormItem>
                </Col>
                <Col :span="8">
                  <FormItem label="Trigger On" required>
                    <Select v-model:value="form.trigger_on" size="large">
                      <SelectOption v-for="opt in triggerOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </SelectOption>
                    </Select>
                  </FormItem>
                </Col>
              </Row>

              <Divider>Assignment Configuration</Divider>

              <!-- Type-specific configuration -->
              <template v-if="form.assignment_type === 'DIRECT_USER'">
                <FormItem label="Assign To User">
                  <Select
                    v-model:value="form.user_id"
                    placeholder="Select user"
                    size="large"
                    :options="availableUsers"
                    allow-clear
                  />
                </FormItem>
              </template>

              <template v-else-if="form.assignment_type === 'LOAD_BASED'">
                <FormItem label="From Role">
                  <Select
                    v-model:value="form.role_id"
                    placeholder="Select role"
                    size="large"
                    :options="availableRoles"
                    allow-clear
                  />
                  <div class="help-text">Assigns to user in this role with fewest assigned records</div>
                </FormItem>
              </template>

              <template v-else-if="form.assignment_type === 'LOOKUP_FIELD'">
                <Row :gutter="24">
                  <Col :span="12">
                    <FormItem label="Lookup Field">
                      <Input v-model:value="form.lookup_field" placeholder="e.g., manager_id" size="large" />
                    </FormItem>
                  </Col>
                  <Col :span="12">
                    <FormItem label="Fallback Role">
                      <Select
                        v-model:value="form.role_id"
                        placeholder="Select fallback role"
                        size="large"
                        :options="availableRoles"
                        allow-clear
                      />
                    </FormItem>
                  </Col>
                </Row>
              </template>

              <template v-else-if="form.assignment_type === 'EXPRESSION'">
                <FormItem label="Expression">
                  <Textarea
                    v-model:value="form.expression"
                    :rows="3"
                    placeholder="e.g., record.department.manager_id"
                    class="code-input"
                  />
                  <div class="help-text">Python expression that evaluates to a user ID</div>
                </FormItem>
              </template>

              <template v-else-if="form.assignment_type === 'ROUND_ROBIN'">
                <FormItem label="Round-Robin Group">
                  <Input v-model:value="form.round_robin_group" placeholder="Enter group name" size="large" />
                  <div class="help-text">Configure groups in the Round-Robin Groups tab</div>
                </FormItem>
              </template>

              <FormItem label="Condition (JSON Domain)">
                <Textarea
                  v-model:value="form.condition_domain"
                  :rows="3"
                  placeholder='[["status", "=", "new"]]'
                  class="code-input"
                />
                <div class="help-text">Only apply this rule when record matches condition</div>
              </FormItem>

              <Row :gutter="24">
                <Col :span="12">
                  <FormItem label="Sequence">
                    <InputNumber
                      v-model:value="form.sequence"
                      :min="1"
                      :max="999"
                      style="width: 100%"
                      size="large"
                    />
                    <div class="help-text">Lower sequence runs first</div>
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Status">
                    <Switch v-model:checked="form.is_active" />
                    <span class="switch-label">{{ form.is_active ? 'Active' : 'Inactive' }}</span>
                  </FormItem>
                </Col>
              </Row>
            </Form>
          </Card>
        </div>
      </div>
    </Spin>
  </div>
</template>

<script>
export default {
  name: 'AssignmentRuleFormPage',
}
</script>
