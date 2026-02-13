<script setup>
import { ref, onMounted } from 'vue'
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Divider,
  message,
  Modal,
  PageHeader,
  Space,
  Spin,
  Table,
  Tag,
  Timeline,
  Tooltip,
  DescriptionsItem,
  TimelineItem,
} from 'ant-design-vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  EyeOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import {
  getApprovalChainsApi,
  getApprovalChainApi,
  updateApprovalChainApi,
  deleteApprovalChainApi,
} from '#/api/base_automation'
import ApprovalChainForm from './approval-chains-form.vue'

const loading = ref(false)
const chains = ref([])
const showViewModal = ref(false)
const selectedChain = ref(null)

// Form view state
const showForm = ref(false)
const editingChainId = ref(null)

const chainTypeOptions = [
  { value: 'SEQUENTIAL', label: 'Sequential', description: 'Approvers review one after another' },
  { value: 'PARALLEL', label: 'Parallel', description: 'All approvers review at the same time' },
  { value: 'ANY_ONE', label: 'Any One', description: 'First approver to respond decides' },
]

const fetchChains = async () => {
  loading.value = true
  try {
    const response = await getApprovalChainsApi({})
    chains.value = response.items || response.data?.items || response || []
  } catch (e) {
    message.error('Failed to load approval chains')
    console.error(e)
  } finally {
    loading.value = false
  }
}

const openCreateForm = () => {
  editingChainId.value = null
  showForm.value = true
}

const openEditForm = (chain) => {
  editingChainId.value = chain.id
  showForm.value = true
}

const handleFormBack = () => {
  showForm.value = false
  editingChainId.value = null
}

const handleFormSaved = () => {
  fetchChains()
}

const viewChain = async (chain) => {
  try {
    const detail = await getApprovalChainApi(chain.id)
    selectedChain.value = detail.data || detail
  } catch (e) {
    selectedChain.value = chain
  }
  showViewModal.value = true
}

const toggleChain = async (chain) => {
  try {
    await updateApprovalChainApi(chain.id, { is_active: !chain.is_active })
    message.success(`Approval chain ${chain.is_active ? 'deactivated' : 'activated'} successfully`)
    await fetchChains()
  } catch (e) {
    message.error('Failed to update approval chain status')
  }
}

const deleteChain = (chain) => {
  Modal.confirm({
    title: 'Delete Approval Chain',
    content: `Are you sure you want to delete "${chain.name}"? This cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    cancelText: 'Cancel',
    async onOk() {
      try {
        await deleteApprovalChainApi(chain.id)
        message.success('Approval chain deleted successfully')
        await fetchChains()
      } catch (e) {
        message.error('Failed to delete approval chain')
      }
    },
  })
}

const getChainTypeColor = (type) => {
  switch (type) {
    case 'SEQUENTIAL': return 'blue'
    case 'PARALLEL': return 'green'
    case 'ANY_ONE': return 'orange'
    default: return 'default'
  }
}

const getApproverTypeIcon = (type) => {
  switch (type) {
    case 'USER': return UserOutlined
    case 'GROUP': return TeamOutlined
    default: return UserOutlined
  }
}

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Type', key: 'chain_type', width: 120 },
  { title: 'Steps', key: 'steps', width: 80 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Actions', key: 'actions', width: 200, fixed: 'right' },
]

onMounted(() => {
  fetchChains()
})
</script>

<template>
  <!-- Show Form View when creating/editing -->
  <ApprovalChainForm
    v-if="showForm"
    :chain-id="editingChainId"
    @back="handleFormBack"
    @saved="handleFormSaved"
  />

  <!-- Show List View -->
  <div v-else class="approvals-page">
    <PageHeader
      title="Approval Chains"
      sub-title="Configure multi-level approval workflows"
    >
      <template #extra>
        <Button type="primary" @click="openCreateForm">
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
              {{ record.chain_type }}
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
                <Button type="text" size="small" @click="viewChain(record)">
                  <template #icon><EyeOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip title="Edit">
                <Button type="text" size="small" @click="openEditForm(record)">
                  <template #icon><EditOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip :title="record.is_active ? 'Deactivate' : 'Activate'">
                <Button type="text" size="small" @click="toggleChain(record)">
                  <template #icon>
                    <PauseCircleOutlined v-if="record.is_active" />
                    <PlayCircleOutlined v-else />
                  </template>
                </Button>
              </Tooltip>
              <Tooltip title="Delete">
                <Button type="text" size="small" danger @click="deleteChain(record)">
                  <template #icon><DeleteOutlined /></template>
                </Button>
              </Tooltip>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

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
              {{ selectedChain.chain_type }}
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

<script>
export default {
  name: 'ApprovalChainsList',
}
</script>

<style scoped>
.approvals-page {
  padding: 0;
}

.mb-4 {
  margin-bottom: 16px;
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
