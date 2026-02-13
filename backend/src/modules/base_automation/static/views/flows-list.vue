<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Page } from '@vben/common-ui'
import {
  Button,
  Card,
  Input,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CopyOutlined,
  ReloadOutlined,
  SearchOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue'
import {
  getFlowsApi,
  deleteFlowApi,
  activateFlowApi,
  deactivateFlowApi,
  cloneFlowApi,
} from '#/api/base_automation'

// Define constants locally to avoid undefined issues during module loading
const FLOW_TRIGGER_TYPES = [
  { value: 'record', label: 'Record Change' },
  { value: 'schedule', label: 'Scheduled' },
  { value: 'manual', label: 'Manual' },
  { value: 'api', label: 'API Call' },
  { value: 'subflow', label: 'Subflow' },
]

const FLOW_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'default' },
  { value: 'active', label: 'Active', color: 'success' },
  { value: 'inactive', label: 'Inactive', color: 'warning' },
]

const triggerOptions = FLOW_TRIGGER_TYPES.map(t => ({ value: t.value, label: t.label }))
const statusOptions = FLOW_STATUSES.map(s => ({ value: s.value, label: s.label }))

defineOptions({
  name: 'FlowsList',
})

const router = useRouter()
const loading = ref(false)
const flows = ref([])
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
})

// Filters
const filterTriggerType = ref('')
const filterStatus = ref('')
const searchText = ref('')

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
  { title: 'Code', dataIndex: 'code', key: 'code', width: 150 },
  { title: 'Trigger', key: 'trigger_type', width: 140 },
  { title: 'Version', dataIndex: 'version', key: 'version', width: 80, align: 'center' },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Updated', key: 'updated_at', width: 120 },
  { title: 'Actions', key: 'actions', width: 180, fixed: 'right' },
]

const getTriggerLabel = (type) => {
  const found = FLOW_TRIGGER_TYPES.find(t => t.value === type)
  return found ? found.label : type
}

const getTriggerIcon = (type) => {
  const found = FLOW_TRIGGER_TYPES.find(t => t.value === type)
  return found ? found.icon : 'lucide:zap'
}

const getStatusColor = (status) => {
  const found = FLOW_STATUSES.find(s => s.value === status)
  return found ? found.color : 'default'
}

const getStatusLabel = (status) => {
  const found = FLOW_STATUSES.find(s => s.value === status)
  return found ? found.label : status
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString()
}

const fetchFlows = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.current,
      page_size: pagination.value.pageSize,
    }
    if (filterTriggerType.value) params.trigger_type = filterTriggerType.value
    if (filterStatus.value) params.status = filterStatus.value
    if (searchText.value) params.search = searchText.value

    const response = await getFlowsApi(params)
    flows.value = response.items || []
    pagination.value.total = response.total || 0
  } catch (e) {
    message.error('Failed to load flows')
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleTableChange = (pag) => {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  fetchFlows()
}

const createFlow = () => {
  router.push('/base/flow-designer')
}

const editFlow = (flow) => {
  router.push(`/base/flow-designer?id=${flow.id}`)
}

const viewExecutions = (flow) => {
  router.push(`/base/flow-designer?id=${flow.id}&tab=executions`)
}

const toggleFlow = async (flow) => {
  try {
    if (flow.status === 'active') {
      await deactivateFlowApi(flow.id)
      message.success('Flow deactivated')
    } else {
      await activateFlowApi(flow.id)
      message.success('Flow activated')
    }
    await fetchFlows()
  } catch (e) {
    message.error('Failed to update flow status')
    console.error(e)
  }
}

const cloneFlow = async (flow) => {
  try {
    await cloneFlowApi(flow.id)
    message.success('Flow cloned successfully')
    await fetchFlows()
  } catch (e) {
    message.error('Failed to clone flow')
    console.error(e)
  }
}

const deleteFlow = (flow) => {
  Modal.confirm({
    title: 'Delete Flow',
    content: `Are you sure you want to delete "${flow.name}"? This cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    async onOk() {
      try {
        await deleteFlowApi(flow.id)
        message.success('Flow deleted')
        await fetchFlows()
      } catch (e) {
        message.error('Failed to delete flow')
        console.error(e)
      }
    },
  })
}

const handleSearch = () => {
  pagination.value.current = 1
  fetchFlows()
}

onMounted(() => {
  fetchFlows()
})
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Flow Designer</h1>
          <p class="text-gray-500">Create and manage automated workflows</p>
        </div>
        <Button type="primary" @click="createFlow">
          <template #icon><PlusOutlined /></template>
          Create Flow
        </Button>
      </div>

      <Card>
        <!-- Filters -->
        <div class="mb-4 flex flex-wrap gap-3">
          <Input
            v-model:value="searchText"
            placeholder="Search flows..."
            style="width: 250px"
            allow-clear
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </Input>
          <Select
            v-model:value="filterTriggerType"
            placeholder="Trigger Type"
            style="width: 160px"
            allow-clear
            :options="triggerOptions"
            @change="handleSearch"
          />
          <Select
            v-model:value="filterStatus"
            placeholder="Status"
            style="width: 120px"
            allow-clear
            :options="statusOptions"
            @change="handleSearch"
          />
          <Button @click="fetchFlows">
            <template #icon><ReloadOutlined /></template>
          </Button>
        </div>

        <!-- Table -->
        <Table
          :columns="columns"
          :data-source="flows"
          :loading="loading"
          :pagination="pagination"
          :scroll="{ x: 1000 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'trigger_type'">
              <Tag color="blue">
                {{ getTriggerLabel(record.trigger_type) }}
              </Tag>
            </template>

            <template v-else-if="column.key === 'status'">
              <Tag :color="getStatusColor(record.status)">
                {{ getStatusLabel(record.status) }}
              </Tag>
            </template>

            <template v-else-if="column.key === 'updated_at'">
              {{ formatDate(record.updated_at) }}
            </template>

            <template v-else-if="column.key === 'actions'">
              <Space>
                <Tooltip title="Edit">
                  <Button type="text" size="small" @click="editFlow(record)">
                    <template #icon><EditOutlined /></template>
                  </Button>
                </Tooltip>
                <Tooltip title="Executions">
                  <Button type="text" size="small" @click="viewExecutions(record)">
                    <template #icon><HistoryOutlined /></template>
                  </Button>
                </Tooltip>
                <Tooltip :title="record.status === 'active' ? 'Deactivate' : 'Activate'">
                  <Button type="text" size="small" @click="toggleFlow(record)">
                    <template #icon>
                      <PauseCircleOutlined v-if="record.status === 'active'" />
                      <PlayCircleOutlined v-else />
                    </template>
                  </Button>
                </Tooltip>
                <Tooltip title="Clone">
                  <Button type="text" size="small" @click="cloneFlow(record)">
                    <template #icon><CopyOutlined /></template>
                  </Button>
                </Tooltip>
                <Tooltip title="Delete">
                  <Button type="text" size="small" danger @click="deleteFlow(record)">
                    <template #icon><DeleteOutlined /></template>
                  </Button>
                </Tooltip>
              </Space>
            </template>
          </template>

        </Table>

        <!-- Empty State -->
        <div v-if="!loading && flows.length === 0" class="py-8 text-center">
          <ThunderboltOutlined style="font-size: 48px; color: #d9d9d9" />
          <p class="mt-4 text-gray-500">No flows found</p>
          <Button type="primary" class="mt-4" @click="createFlow">
            Create Your First Flow
          </Button>
        </div>
      </Card>
    </div>
  </Page>
</template>
