<script setup>
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
import {
  getPendingApprovalsApi,
  getApprovalHistoryApi,
  approveTaskApi,
  rejectTaskApi,
  delegateTaskApi,
} from '#/api/base_automation'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const loading = ref(false)
const tasks = ref([])
const historyTasks = ref([])
const activeTab = ref('pending')
const approveModalVisible = ref(false)
const rejectModalVisible = ref(false)
const delegateModalVisible = ref(false)
const selectedTask = ref(null)
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
    const response = await getPendingApprovalsApi({})
    tasks.value = response.items || response.data?.items || response || []

    const historyResponse = await getApprovalHistoryApi({})
    historyTasks.value = historyResponse.items || historyResponse.data?.items || historyResponse || []
  } catch (e) {
    message.error('Failed to load approval tasks')
    console.error(e)
  } finally {
    loading.value = false
  }
}

const isOverdue = (task) => {
  if (!task.due_at) return false
  return dayjs(task.due_at).isBefore(dayjs())
}

const getTimeRemaining = (task) => {
  if (!task.due_at) return null
  const due = dayjs(task.due_at)
  if (due.isBefore(dayjs())) {
    return `Overdue by ${dayjs().to(due, true)}`
  }
  return `Due ${due.fromNow()}`
}

const getStatusColor = (status) => {
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

const openApproveModal = (task) => {
  selectedTask.value = task
  approveComments.value = ''
  approveModalVisible.value = true
}

const openRejectModal = (task) => {
  selectedTask.value = task
  rejectReason.value = ''
  rejectModalVisible.value = true
}

const openDelegateModal = (task) => {
  selectedTask.value = task
  delegateToUserId.value = ''
  delegateReason.value = ''
  delegateModalVisible.value = true
}

const handleApprove = async () => {
  if (!selectedTask.value) return

  processing.value = true
  try {
    await approveTaskApi(selectedTask.value.id, {
      comments: approveComments.value,
    })
    message.success('Task approved successfully')
    approveModalVisible.value = false
    await fetchTasks()
  } catch (error) {
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
    await rejectTaskApi(selectedTask.value.id, {
      reason: rejectReason.value,
    })
    message.success('Task rejected')
    rejectModalVisible.value = false
    await fetchTasks()
  } catch (error) {
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
    await delegateTaskApi(selectedTask.value.id, {
      to_user_id: delegateToUserId.value,
      reason: delegateReason.value,
    })
    message.success('Task delegated successfully')
    delegateModalVisible.value = false
    await fetchTasks()
  } catch (error) {
    message.error(error.response?.data?.error?.message || 'Failed to delegate task')
  } finally {
    processing.value = false
  }
}

const formatEntityType = (type) => {
  if (!type) return ''
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

const historyColumns = [
  { title: 'Document', key: 'document' },
  { title: 'Step', dataIndex: 'step_name', key: 'step_name' },
  { title: 'Decision', key: 'decision' },
  { title: 'Completed', key: 'completed' },
]

onMounted(() => {
  fetchTasks()
})
</script>

<template>
  <div class="approval-inbox">
    <APageHeader
      title="Approvals"
      sub-title="Review and action pending approval requests"
    >
      <template #avatar>
        <AAvatar :style="{ backgroundColor: '#1890ff' }">
          <template #icon><CheckCircleOutlined /></template>
        </AAvatar>
      </template>
    </APageHeader>

    <ACard>
      <!-- Header Stats -->
      <div class="inbox-header">
        <ARow :gutter="16">
          <ACol :span="8">
            <AStatistic title="Pending Approvals" :value="pendingCount">
              <template #prefix>
                <ClockCircleOutlined style="color: #1890ff" />
              </template>
            </AStatistic>
          </ACol>
          <ACol :span="8">
            <AStatistic title="Overdue" :value="overdueCount">
              <template #prefix>
                <ExclamationCircleOutlined style="color: #ff4d4f" />
              </template>
            </AStatistic>
          </ACol>
          <ACol :span="8">
            <AButton type="primary" @click="fetchTasks" :loading="loading">
              <template #icon><ReloadOutlined /></template>
              Refresh
            </AButton>
          </ACol>
        </ARow>
      </div>

      <!-- Tabs -->
      <ATabs v-model:activeKey="activeTab">
        <ATabPane key="pending" tab="Pending">
          <ABadge :count="pendingCount" />
        </ATabPane>
        <ATabPane key="history" tab="History" />
      </ATabs>

      <!-- Pending Tasks -->
      <div v-if="activeTab === 'pending'">
        <ASpin :spinning="loading">
          <AEmpty v-if="tasks.length === 0" description="No pending approvals" />

          <AList v-else :data-source="tasks" item-layout="horizontal">
            <template #renderItem="{ item }">
              <AListItem>
                <template #actions>
                  <AButton type="primary" size="small" @click="openApproveModal(item)">
                    <template #icon><CheckCircleOutlined /></template>
                    Approve
                  </AButton>
                  <AButton danger size="small" @click="openRejectModal(item)">
                    <template #icon><CloseCircleOutlined /></template>
                    Reject
                  </AButton>
                  <AButton size="small" @click="openDelegateModal(item)">
                    <template #icon><UserSwitchOutlined /></template>
                    Delegate
                  </AButton>
                </template>
                <AListItemMeta>
                  <template #avatar>
                    <AAvatar :style="{ backgroundColor: isOverdue(item) ? '#ff4d4f' : '#1890ff' }">
                      <template #icon><FileTextOutlined /></template>
                    </AAvatar>
                  </template>
                  <template #title>
                    <span>
                      {{ formatEntityType(item.entity_type) }}
                      <ATag v-if="item.entity_ref">{{ item.entity_ref }}</ATag>
                    </span>
                    <ATag :color="isOverdue(item) ? 'red' : 'default'" style="margin-left: 8px">
                      {{ item.chain_name }}
                    </ATag>
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
                </AListItemMeta>
              </AListItem>
            </template>
          </AList>
        </ASpin>
      </div>

      <!-- History -->
      <div v-if="activeTab === 'history'">
        <ATable
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
              <ATag v-if="record.entity_ref" style="margin-left: 4px">{{ record.entity_ref }}</ATag>
            </template>
            <template v-else-if="column.key === 'decision'">
              <ATag :color="getStatusColor(record.status)">{{ record.status }}</ATag>
            </template>
            <template v-else-if="column.key === 'completed'">
              {{ record.completed_at ? dayjs(record.completed_at).format('DD MMM YYYY HH:mm') : '-' }}
            </template>
          </template>
        </ATable>
      </div>
    </ACard>

    <!-- Approve Modal -->
    <AModal
      v-model:open="approveModalVisible"
      title="Approve Task"
      @ok="handleApprove"
      :confirmLoading="processing"
    >
      <div v-if="selectedTask">
        <ADescriptions :column="1" bordered size="small" class="mb-4">
          <ADescriptionsItem label="Document">
            {{ formatEntityType(selectedTask.entity_type) }}
            <ATag v-if="selectedTask.entity_ref">{{ selectedTask.entity_ref }}</ATag>
          </ADescriptionsItem>
          <ADescriptionsItem label="Step">{{ selectedTask.step_name }}</ADescriptionsItem>
          <ADescriptionsItem label="Chain">{{ selectedTask.chain_name }}</ADescriptionsItem>
        </ADescriptions>

        <AFormItem label="Comments (Optional)">
          <ATextarea v-model:value="approveComments" :rows="3" placeholder="Add approval comments" />
        </AFormItem>
      </div>
    </AModal>

    <!-- Reject Modal -->
    <AModal
      v-model:open="rejectModalVisible"
      title="Reject Task"
      @ok="handleReject"
      :confirmLoading="processing"
      okType="danger"
      okText="Reject"
    >
      <div v-if="selectedTask">
        <AAlert
          message="This action will reject the approval request"
          type="warning"
          show-icon
          class="mb-4"
        />

        <ADescriptions :column="1" bordered size="small" class="mb-4">
          <ADescriptionsItem label="Document">
            {{ formatEntityType(selectedTask.entity_type) }}
            <ATag v-if="selectedTask.entity_ref">{{ selectedTask.entity_ref }}</ATag>
          </ADescriptionsItem>
          <ADescriptionsItem label="Step">{{ selectedTask.step_name }}</ADescriptionsItem>
        </ADescriptions>

        <AFormItem label="Rejection Reason" required>
          <ATextarea
            v-model:value="rejectReason"
            :rows="3"
            placeholder="Please provide a reason for rejection"
          />
        </AFormItem>
      </div>
    </AModal>

    <!-- Delegate Modal -->
    <AModal
      v-model:open="delegateModalVisible"
      title="Delegate Task"
      @ok="handleDelegate"
      :confirmLoading="processing"
    >
      <div v-if="selectedTask">
        <ADescriptions :column="1" bordered size="small" class="mb-4">
          <ADescriptionsItem label="Document">
            {{ formatEntityType(selectedTask.entity_type) }}
            <ATag v-if="selectedTask.entity_ref">{{ selectedTask.entity_ref }}</ATag>
          </ADescriptionsItem>
          <ADescriptionsItem label="Step">{{ selectedTask.step_name }}</ADescriptionsItem>
        </ADescriptions>

        <AFormItem label="Delegate To" required>
          <AInput v-model:value="delegateToUserId" placeholder="Enter user ID to delegate to" />
        </AFormItem>

        <AFormItem label="Reason (Optional)">
          <ATextarea v-model:value="delegateReason" :rows="2" placeholder="Reason for delegation" />
        </AFormItem>
      </div>
    </AModal>
  </div>
</template>

<script>
export default {
  name: 'ApprovalInbox',
}
</script>
