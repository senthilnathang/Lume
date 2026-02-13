<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserSwitchOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue'
import { approvalsApi, type ApprovalTask, type ApprovalStatus } from '#/api'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface Props {
  userId?: string
  showHistory?: boolean
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showHistory: false,
  compact: false,
})

const emit = defineEmits(['approved', 'rejected', 'delegated', 'refresh'])

const loading = ref(false)
const tasks = ref<ApprovalTask[]>([])
const historyTasks = ref<ApprovalTask[]>([])
const activeTab = ref('pending')
const approveModalVisible = ref(false)
const rejectModalVisible = ref(false)
const delegateModalVisible = ref(false)
const selectedTask = ref<ApprovalTask | null>(null)
const approveComments = ref('')
const rejectReason = ref('')
const delegateToUserId = ref('')
const delegateReason = ref('')
const processing = ref(false)

const pendingCount = computed(() => tasks.value.length)
const overdueCount = computed(() => tasks.value.filter(t => isOverdue(t)).length)

const fetchTasks = async () => {
  loading.value = true
  try {
    const params = props.userId ? { assigned_to: props.userId } : {}
    const response = await approvalsApi.getPendingTasks(params)
    tasks.value = (response as any).data?.data ?? response ?? []

    if (props.showHistory) {
      const historyResponse = await approvalsApi.getTaskHistory(params)
      historyTasks.value = (historyResponse as any).data?.data ?? historyResponse ?? []
    }
  } catch {
    message.error('Failed to load approval tasks')
  } finally {
    loading.value = false
  }
}

const isOverdue = (task: ApprovalTask) => {
  if (!task.due_at) return false
  return dayjs(task.due_at).isBefore(dayjs())
}

const getTimeRemaining = (task: ApprovalTask) => {
  if (!task.due_at) return null
  const due = dayjs(task.due_at)
  if (due.isBefore(dayjs())) {
    return `Overdue by ${dayjs().to(due, true)}`
  }
  return `Due ${due.fromNow()}`
}

const getStatusColor = (status: ApprovalStatus) => {
  switch (status) {
    case 'PENDING': return 'processing'
    case 'APPROVED': return 'success'
    case 'REJECTED': return 'error'
    case 'DELEGATED': return 'warning'
    case 'ESCALATED': return 'orange'
    case 'CANCELLED': return 'default'
    default: return 'default'
  }
}

const openApproveModal = (task: ApprovalTask) => {
  selectedTask.value = task
  approveComments.value = ''
  approveModalVisible.value = true
}

const openRejectModal = (task: ApprovalTask) => {
  selectedTask.value = task
  rejectReason.value = ''
  rejectModalVisible.value = true
}

const openDelegateModal = (task: ApprovalTask) => {
  selectedTask.value = task
  delegateToUserId.value = ''
  delegateReason.value = ''
  delegateModalVisible.value = true
}

const handleApprove = async () => {
  if (!selectedTask.value) return

  processing.value = true
  try {
    const userId = props.userId || localStorage.getItem('aibooks_user_id') || ''
    await approvalsApi.approveTask(selectedTask.value.id, {
      user_id: userId,
      comments: approveComments.value,
    })
    message.success('Task approved successfully')
    approveModalVisible.value = false
    emit('approved', selectedTask.value)
    await fetchTasks()
  } catch (error: any) {
    message.error(error.response?.data?.error?.message || 'Failed to approve task')
  } finally {
    processing.value = false
  }
}

const handleReject = async () => {
  if (!selectedTask.value || !rejectReason.value) {
    message.error('Rejection reason is required')
    return
  }

  processing.value = true
  try {
    const userId = props.userId || localStorage.getItem('aibooks_user_id') || ''
    await approvalsApi.rejectTask(selectedTask.value.id, {
      user_id: userId,
      reason: rejectReason.value,
    })
    message.success('Task rejected')
    rejectModalVisible.value = false
    emit('rejected', selectedTask.value)
    await fetchTasks()
  } catch (error: any) {
    message.error(error.response?.data?.error?.message || 'Failed to reject task')
  } finally {
    processing.value = false
  }
}

const handleDelegate = async () => {
  if (!selectedTask.value || !delegateToUserId.value) {
    message.error('Please select a user to delegate to')
    return
  }

  processing.value = true
  try {
    const fromUserId = props.userId || localStorage.getItem('aibooks_user_id') || ''
    await approvalsApi.delegateTask(selectedTask.value.id, {
      from_user_id: fromUserId,
      to_user_id: delegateToUserId.value,
      reason: delegateReason.value,
    })
    message.success('Task delegated successfully')
    delegateModalVisible.value = false
    emit('delegated', selectedTask.value)
    await fetchTasks()
  } catch (error: any) {
    message.error(error.response?.data?.error?.message || 'Failed to delegate task')
  } finally {
    processing.value = false
  }
}

const formatEntityType = (type: string) => {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// columns available for table view if needed
// const columns = [
//   { title: 'Document', key: 'document' },
//   { title: 'Step', dataIndex: 'step_name', key: 'step_name' },
//   { title: 'Due', key: 'due' },
//   { title: 'Actions', key: 'actions', width: 200 },
// ]

const historyColumns = [
  { title: 'Document', key: 'document' },
  { title: 'Step', dataIndex: 'step_name', key: 'step_name' },
  { title: 'Decision', key: 'decision' },
  { title: 'Completed', key: 'completed' },
]

onMounted(() => {
  fetchTasks()
})

defineExpose({
  refresh: fetchTasks,
})
</script>

<template>
  <div class="approval-inbox" :class="{ compact: props.compact }">
    <!-- Header Stats -->
    <div class="inbox-header" v-if="!compact">
      <a-row :gutter="16">
        <a-col :span="8">
          <a-statistic title="Pending Approvals" :value="pendingCount">
            <template #prefix>
              <ClockCircleOutlined style="color: #1890ff" />
            </template>
          </a-statistic>
        </a-col>
        <a-col :span="8">
          <a-statistic title="Overdue" :value="overdueCount">
            <template #prefix>
              <ExclamationCircleOutlined style="color: #ff4d4f" />
            </template>
          </a-statistic>
        </a-col>
        <a-col :span="8">
          <a-button type="primary" @click="fetchTasks" :loading="loading">
            <template #icon><ReloadOutlined /></template>
            Refresh
          </a-button>
        </a-col>
      </a-row>
    </div>

    <!-- Tabs -->
    <a-tabs v-model:activeKey="activeTab" v-if="showHistory">
      <a-tab-pane key="pending" tab="Pending">
        <a-badge :count="pendingCount" />
      </a-tab-pane>
      <a-tab-pane key="history" tab="History" />
    </a-tabs>

    <!-- Pending Tasks -->
    <div v-if="activeTab === 'pending'">
      <a-spin :spinning="loading">
        <a-empty v-if="tasks.length === 0" description="No pending approvals" />

        <a-list v-else :data-source="tasks" item-layout="horizontal">
          <template #renderItem="{ item }">
            <a-list-item>
              <template #actions>
                <a-button type="primary" size="small" @click="openApproveModal(item)">
                  <template #icon><CheckCircleOutlined /></template>
                  Approve
                </a-button>
                <a-button danger size="small" @click="openRejectModal(item)">
                  <template #icon><CloseCircleOutlined /></template>
                  Reject
                </a-button>
                <a-button size="small" @click="openDelegateModal(item)">
                  <template #icon><UserSwitchOutlined /></template>
                  Delegate
                </a-button>
              </template>
              <a-list-item-meta>
                <template #avatar>
                  <a-avatar :style="{ backgroundColor: isOverdue(item) ? '#ff4d4f' : '#1890ff' }">
                    <template #icon><FileTextOutlined /></template>
                  </a-avatar>
                </template>
                <template #title>
                  <span>
                    {{ formatEntityType(item.entity_type) }}
                    <a-tag v-if="item.entity_ref">{{ item.entity_ref }}</a-tag>
                  </span>
                  <a-tag :color="isOverdue(item) ? 'red' : 'default'" style="margin-left: 8px">
                    {{ item.chain_name }}
                  </a-tag>
                </template>
                <template #description>
                  <div>
                    <span class="step-name">{{ item.step_name }}</span>
                    <span class="time-info" :class="{ overdue: isOverdue(item) }">
                      {{ getTimeRemaining(item) }}
                    </span>
                  </div>
                  <div v-if="item.comments" class="task-comments">
                    {{ item.comments }}
                  </div>
                </template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>
      </a-spin>
    </div>

    <!-- History -->
    <div v-if="activeTab === 'history' && showHistory">
      <a-table
        :columns="historyColumns"
        :data-source="historyTasks"
        :loading="loading"
        :pagination="{ pageSize: 10 }"
        size="small"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'document'">
            <span>{{ formatEntityType(record.entity_type) }}</span>
            <a-tag v-if="record.entity_ref" style="margin-left: 4px">{{ record.entity_ref }}</a-tag>
          </template>
          <template v-else-if="column.key === 'decision'">
            <a-tag :color="getStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'completed'">
            {{ record.completed_at ? dayjs(record.completed_at).format('DD MMM YYYY HH:mm') : '-' }}
          </template>
        </template>
      </a-table>
    </div>

    <!-- Approve Modal -->
    <a-modal
      v-model:open="approveModalVisible"
      title="Approve Task"
      @ok="handleApprove"
      :confirmLoading="processing"
    >
      <div v-if="selectedTask">
        <a-descriptions :column="1" bordered size="small" class="mb-4">
          <a-descriptions-item label="Document">
            {{ formatEntityType(selectedTask.entity_type) }}
            <a-tag v-if="selectedTask.entity_ref">{{ selectedTask.entity_ref }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="Step">{{ selectedTask.step_name }}</a-descriptions-item>
          <a-descriptions-item label="Chain">{{ selectedTask.chain_name }}</a-descriptions-item>
        </a-descriptions>

        <a-form-item label="Comments (Optional)">
          <a-textarea v-model:value="approveComments" :rows="3" placeholder="Add approval comments" />
        </a-form-item>
      </div>
    </a-modal>

    <!-- Reject Modal -->
    <a-modal
      v-model:open="rejectModalVisible"
      title="Reject Task"
      @ok="handleReject"
      :confirmLoading="processing"
      okType="danger"
      okText="Reject"
    >
      <div v-if="selectedTask">
        <a-alert
          message="This action will reject the approval request"
          type="warning"
          show-icon
          class="mb-4"
        />

        <a-descriptions :column="1" bordered size="small" class="mb-4">
          <a-descriptions-item label="Document">
            {{ formatEntityType(selectedTask.entity_type) }}
            <a-tag v-if="selectedTask.entity_ref">{{ selectedTask.entity_ref }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="Step">{{ selectedTask.step_name }}</a-descriptions-item>
        </a-descriptions>

        <a-form-item label="Rejection Reason" required>
          <a-textarea
            v-model:value="rejectReason"
            :rows="3"
            placeholder="Please provide a reason for rejection"
          />
        </a-form-item>
      </div>
    </a-modal>

    <!-- Delegate Modal -->
    <a-modal
      v-model:open="delegateModalVisible"
      title="Delegate Task"
      @ok="handleDelegate"
      :confirmLoading="processing"
    >
      <div v-if="selectedTask">
        <a-descriptions :column="1" bordered size="small" class="mb-4">
          <a-descriptions-item label="Document">
            {{ formatEntityType(selectedTask.entity_type) }}
            <a-tag v-if="selectedTask.entity_ref">{{ selectedTask.entity_ref }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="Step">{{ selectedTask.step_name }}</a-descriptions-item>
        </a-descriptions>

        <a-form-item label="Delegate To" required>
          <a-input v-model:value="delegateToUserId" placeholder="Enter user ID to delegate to" />
        </a-form-item>

        <a-form-item label="Reason (Optional)">
          <a-textarea v-model:value="delegateReason" :rows="2" placeholder="Reason for delegation" />
        </a-form-item>
      </div>
    </a-modal>
  </div>
</template>

<script lang="ts">
export default {
  name: 'ApprovalInbox',
}
</script>

<style scoped>
.approval-inbox {
  padding: 16px;
}

.approval-inbox.compact {
  padding: 8px;
}

.inbox-header {
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.step-name {
  font-weight: 500;
}

.time-info {
  margin-left: 12px;
  color: #999;
  font-size: 12px;
}

.time-info.overdue {
  color: #ff4d4f;
  font-weight: 500;
}

.task-comments {
  margin-top: 4px;
  color: #666;
  font-size: 12px;
  font-style: italic;
}

.mb-4 {
  margin-bottom: 16px;
}
</style>
