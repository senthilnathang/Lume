<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Page } from '@vben/common-ui'
import {
  Alert,
  Button,
  Card,
  Collapse,
  Divider,
  Drawer,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  TabPane,
  CollapsePanel,
  Textarea,
  FormItem,
} from 'ant-design-vue'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  BranchesOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons-vue'
import {
  getFlowApi,
  createFlowApi,
  updateFlowApi,
  activateFlowApi,
  deactivateFlowApi,
  getFlowExecutionsApi,
} from '#/api/base_automation'

// Define constants locally to avoid undefined issues during module loading
const FLOW_TRIGGER_TYPES = [
  { value: 'record', label: 'Record Change' },
  { value: 'schedule', label: 'Scheduled' },
  { value: 'manual', label: 'Manual' },
  { value: 'api', label: 'API Call' },
  { value: 'subflow', label: 'Subflow' },
]

const FLOW_NODE_TYPES = [
  // Triggers
  { value: 'trigger_record', label: 'Record Trigger', category: 'trigger' },
  { value: 'trigger_schedule', label: 'Schedule Trigger', category: 'trigger' },
  { value: 'trigger_manual', label: 'Manual Trigger', category: 'trigger' },
  // Actions
  { value: 'action_set_field', label: 'Set Field Value', category: 'action' },
  { value: 'action_create_record', label: 'Create Record', category: 'action' },
  { value: 'action_update_record', label: 'Update Record', category: 'action' },
  { value: 'action_delete_record', label: 'Delete Record', category: 'action' },
  { value: 'action_send_email', label: 'Send Email', category: 'action' },
  { value: 'action_call_webhook', label: 'Call Webhook', category: 'action' },
  { value: 'action_approval', label: 'Request Approval', category: 'action' },
  // Logic
  { value: 'condition_if', label: 'If Condition', category: 'logic' },
  { value: 'condition_switch', label: 'Switch', category: 'logic' },
  { value: 'loop_for_each', label: 'For Each Loop', category: 'logic' },
  { value: 'wait_duration', label: 'Wait', category: 'logic' },
  { value: 'parallel', label: 'Parallel Execution', category: 'logic' },
  // End
  { value: 'end_success', label: 'End (Success)', category: 'end' },
  { value: 'end_error', label: 'End (Error)', category: 'end' },
]

const FLOW_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'default' },
  { value: 'active', label: 'Active', color: 'success' },
  { value: 'inactive', label: 'Inactive', color: 'warning' },
]

const FLOW_EXECUTION_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'default' },
  { value: 'running', label: 'Running', color: 'processing' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'failed', label: 'Failed', color: 'error' },
  { value: 'cancelled', label: 'Cancelled', color: 'warning' },
]

defineOptions({
  name: 'FlowDesigner',
})

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const saving = ref(false)
const flowId = ref(null)
const activeTab = ref('designer')

// Flow data
const flow = ref({
  name: '',
  code: '',
  description: '',
  trigger_type: 'record_create',
  trigger_config: {},
  nodes: [],
  edges: [],
  status: 'draft',
})

// Node editor
const showNodeEditor = ref(false)
const editingNode = ref(null)
const nodeForm = ref({
  id: '',
  type: '',
  name: '',
  config: {},
})

// Executions
const executions = ref([])
const executionsLoading = ref(false)

const isNew = computed(() => !flowId.value)
const canActivate = computed(() => flow.value.status === 'draft' || flow.value.status === 'inactive')
const canDeactivate = computed(() => flow.value.status === 'active')

const triggerTypes = computed(() => FLOW_TRIGGER_TYPES)
const nodeCategories = computed(() => {
  const categories = {}
  FLOW_NODE_TYPES.forEach(node => {
    if (!categories[node.category]) {
      categories[node.category] = []
    }
    categories[node.category].push(node)
  })
  return categories
})

const executionColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Started', key: 'started_at', width: 160 },
  { title: 'Completed', key: 'completed_at', width: 160 },
  { title: 'Duration', key: 'duration', width: 100 },
]

const getExecutionStatusColor = (status) => {
  const found = FLOW_EXECUTION_STATUSES.find(s => s.value === status)
  return found ? found.color : 'default'
}

const formatDateTime = (dt) => {
  if (!dt) return '-'
  return new Date(dt).toLocaleString()
}

const formatDuration = (ms) => {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

const fetchFlow = async () => {
  if (!flowId.value) return

  loading.value = true
  try {
    const response = await getFlowApi(flowId.value)
    const data = response.data || response
    flow.value = {
      name: data.name || '',
      code: data.code || '',
      description: data.description || '',
      trigger_type: data.trigger_type || 'record_create',
      trigger_config: data.trigger_config || {},
      nodes: data.nodes || [],
      edges: data.edges || [],
      status: data.status || 'draft',
    }
  } catch (e) {
    message.error('Failed to load flow')
    console.error(e)
  } finally {
    loading.value = false
  }
}

const fetchExecutions = async () => {
  if (!flowId.value) return

  executionsLoading.value = true
  try {
    const response = await getFlowExecutionsApi({ flow_id: flowId.value, page_size: 50 })
    executions.value = response.items || []
  } catch (e) {
    console.error('Failed to load executions:', e)
  } finally {
    executionsLoading.value = false
  }
}

const saveFlow = async () => {
  if (!flow.value.name || !flow.value.code) {
    message.error('Name and Code are required')
    return
  }

  saving.value = true
  try {
    const data = {
      name: flow.value.name,
      code: flow.value.code,
      description: flow.value.description,
      trigger_type: flow.value.trigger_type,
      trigger_config: flow.value.trigger_config,
      nodes: flow.value.nodes,
      edges: flow.value.edges,
    }

    if (isNew.value) {
      const response = await createFlowApi(data)
      const newFlow = response.data || response
      flowId.value = newFlow.id
      message.success('Flow created')
      router.replace(`/base/flow-designer?id=${newFlow.id}`)
    } else {
      await updateFlowApi(flowId.value, data)
      message.success('Flow saved')
    }
    await fetchFlow()
  } catch (e) {
    message.error('Failed to save flow')
    console.error(e)
  } finally {
    saving.value = false
  }
}

const activateFlow = async () => {
  try {
    await activateFlowApi(flowId.value)
    message.success('Flow activated')
    await fetchFlow()
  } catch (e) {
    message.error('Failed to activate flow')
    console.error(e)
  }
}

const deactivateFlow = async () => {
  try {
    await deactivateFlowApi(flowId.value)
    message.success('Flow deactivated')
    await fetchFlow()
  } catch (e) {
    message.error('Failed to deactivate flow')
    console.error(e)
  }
}

const goBack = () => {
  router.push('/base/flows-list')
}

const addNode = (nodeType) => {
  const node = FLOW_NODE_TYPES.find(n => n.value === nodeType)
  if (!node) return

  const newNode = {
    id: `node_${Date.now()}`,
    type: nodeType,
    name: node.label,
    position: { x: 100 + flow.value.nodes.length * 50, y: 100 + flow.value.nodes.length * 50 },
    config: {},
  }

  flow.value.nodes.push(newNode)
  editNode(newNode)
}

const editNode = (node) => {
  editingNode.value = node
  nodeForm.value = {
    id: node.id,
    type: node.type,
    name: node.name,
    config: { ...node.config },
  }
  showNodeEditor.value = true
}

const saveNode = () => {
  if (editingNode.value) {
    editingNode.value.name = nodeForm.value.name
    editingNode.value.config = { ...nodeForm.value.config }
  }
  showNodeEditor.value = false
  editingNode.value = null
}

const deleteNode = (node) => {
  Modal.confirm({
    title: 'Delete Node',
    content: `Are you sure you want to delete "${node.name}"?`,
    okText: 'Delete',
    okType: 'danger',
    onOk() {
      flow.value.nodes = flow.value.nodes.filter(n => n.id !== node.id)
      flow.value.edges = flow.value.edges.filter(e => e.source !== node.id && e.target !== node.id)
    },
  })
}

const getNodeTypeLabel = (type) => {
  const found = FLOW_NODE_TYPES.find(n => n.value === type)
  return found ? found.label : type
}

const getNodeCategory = (type) => {
  const found = FLOW_NODE_TYPES.find(n => n.value === type)
  return found ? found.category : 'action'
}

const getCategoryColor = (category) => {
  const colors = {
    trigger: 'green',
    action: 'blue',
    logic: 'orange',
    end: 'red',
  }
  return colors[category] || 'default'
}

watch(() => route.query.id, (newId) => {
  flowId.value = newId ? parseInt(newId) : null
  if (flowId.value) {
    fetchFlow()
    fetchExecutions()
  }
}, { immediate: true })

watch(() => route.query.tab, (tab) => {
  if (tab) activeTab.value = tab
}, { immediate: true })
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading">
      <div class="p-4">
        <!-- Header -->
        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <Button @click="goBack">
              <template #icon><ArrowLeftOutlined /></template>
              Back
            </Button>
            <div>
              <h1 class="text-xl font-bold">
                {{ isNew ? 'Create Flow' : flow.name || 'Flow Designer' }}
              </h1>
              <div v-if="!isNew" class="flex items-center gap-2 mt-1">
                <Tag :color="getExecutionStatusColor(flow.status)">
                  {{ flow.status }}
                </Tag>
                <span class="text-gray-400 text-sm">{{ flow.code }}</span>
              </div>
            </div>
          </div>
          <Space>
            <Button v-if="canActivate && !isNew" type="primary" @click="activateFlow">
              <template #icon><PlayCircleOutlined /></template>
              Activate
            </Button>
            <Button v-if="canDeactivate" @click="deactivateFlow">
              <template #icon><PauseCircleOutlined /></template>
              Deactivate
            </Button>
            <Button type="primary" :loading="saving" @click="saveFlow">
              <template #icon><SaveOutlined /></template>
              Save
            </Button>
          </Space>
        </div>

        <!-- Tabs -->
        <Tabs v-model:activeKey="activeTab">
          <TabPane key="designer" tab="Designer">
            <div class="flex gap-4">
              <!-- Node Palette -->
              <Card style="width: 280px; flex-shrink: 0">
                <template #title>
                  <BranchesOutlined /> Node Palette
                </template>
                <Collapse :bordered="false" :default-active-key="['trigger', 'action', 'logic']">
                  <CollapsePanel v-for="(nodes, category) in nodeCategories" :key="category" :header="category.charAt(0).toUpperCase() + category.slice(1)">
                    <div class="flex flex-col gap-2">
                      <Button
                        v-for="node in nodes"
                        :key="node.value"
                        block
                        @click="addNode(node.value)"
                      >
                        <template #icon><PlusOutlined /></template>
                        {{ node.label }}
                      </Button>
                    </div>
                  </CollapsePanel>
                </Collapse>
              </Card>

              <!-- Canvas / Flow Settings -->
              <Card style="flex: 1">
                <!-- Flow Settings -->
                <div class="mb-6">
                  <h3 class="text-lg font-medium mb-4">Flow Settings</h3>
                  <Form layout="vertical">
                    <div class="grid grid-cols-2 gap-4">
                      <FormItem label="Name" required>
                        <Input v-model:value="flow.name" placeholder="My Flow" />
                      </FormItem>
                      <FormItem label="Code" required>
                        <Input v-model:value="flow.code" placeholder="my_flow" :disabled="!isNew" />
                      </FormItem>
                    </div>
                    <FormItem label="Description">
                      <Textarea v-model:value="flow.description" :rows="2" placeholder="Describe what this flow does..." />
                    </FormItem>
                    <FormItem label="Trigger Type">
                      <Select v-model:value="flow.trigger_type" style="width: 100%" :options="triggerTypes" />
                    </FormItem>
                  </Form>
                </div>

                <Divider />

                <!-- Nodes List -->
                <div>
                  <h3 class="text-lg font-medium mb-4">Flow Nodes ({{ flow.nodes.length }})</h3>

                  <Alert v-if="flow.nodes.length === 0" type="info" show-icon class="mb-4">
                    Add nodes from the palette on the left to build your flow.
                  </Alert>

                  <div class="space-y-2">
                    <Card
                      v-for="(node, index) in flow.nodes"
                      :key="node.id"
                      size="small"
                      class="cursor-pointer hover:border-blue-400"
                      @click="editNode(node)"
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <span class="text-gray-400 text-sm">{{ index + 1 }}</span>
                          <Tag :color="getCategoryColor(getNodeCategory(node.type))">
                            {{ getNodeTypeLabel(node.type) }}
                          </Tag>
                          <span class="font-medium">{{ node.name }}</span>
                        </div>
                        <Space>
                          <Tooltip title="Configure">
                            <Button type="text" size="small" @click.stop="editNode(node)">
                              <template #icon><SettingOutlined /></template>
                            </Button>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <Button type="text" size="small" danger @click.stop="deleteNode(node)">
                              <template #icon><DeleteOutlined /></template>
                            </Button>
                          </Tooltip>
                        </Space>
                      </div>
                    </Card>
                  </div>
                </div>
              </Card>
            </div>
          </TabPane>

          <TabPane key="executions" tab="Executions" :disabled="isNew">
            <Card>
              <Table
                :columns="executionColumns"
                :data-source="executions"
                :loading="executionsLoading"
                :pagination="{ pageSize: 20 }"
                :locale="{ emptyText: 'No executions yet' }"
                row-key="id"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'status'">
                    <Tag :color="getExecutionStatusColor(record.status)">
                      {{ record.status }}
                    </Tag>
                  </template>
                  <template v-else-if="column.key === 'started_at'">
                    {{ formatDateTime(record.started_at) }}
                  </template>
                  <template v-else-if="column.key === 'completed_at'">
                    {{ formatDateTime(record.completed_at) }}
                  </template>
                  <template v-else-if="column.key === 'duration'">
                    {{ formatDuration(record.execution_time_ms) }}
                  </template>
                </template>
              </Table>

              <!-- Empty State for executions -->
              <div v-if="!loading && executions.length === 0" class="py-8 text-center">
                <ClockCircleOutlined style="font-size: 48px; color: #d9d9d9" />
                <p class="mt-4 text-gray-500">No executions yet</p>
              </div>
            </Card>
          </TabPane>
        </Tabs>

        <!-- Node Editor Drawer -->
        <Drawer
          v-model:open="showNodeEditor"
          title="Configure Node"
          width="400"
          :footer-style="{ textAlign: 'right' }"
        >
          <Form layout="vertical">
            <FormItem label="Node Type">
              <Tag :color="getCategoryColor(getNodeCategory(nodeForm.type))">
                {{ getNodeTypeLabel(nodeForm.type) }}
              </Tag>
            </FormItem>
            <FormItem label="Name">
              <Input v-model:value="nodeForm.name" />
            </FormItem>
            <FormItem label="Configuration">
              <Textarea
                :value="JSON.stringify(nodeForm.config, null, 2)"
                @change="e => { try { nodeForm.config = JSON.parse(e.target.value) } catch {} }"
                :rows="10"
                placeholder='{"key": "value"}'
                style="font-family: monospace"
              />
            </FormItem>
          </Form>
          <template #footer>
            <Space>
              <Button @click="showNodeEditor = false">Cancel</Button>
              <Button type="primary" @click="saveNode">Save</Button>
            </Space>
          </template>
        </Drawer>
      </div>
    </Spin>
  </Page>
</template>
