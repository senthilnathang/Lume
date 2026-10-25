<template>
  <div class="workflow-execution-page">
    <PageHeader
      :title="`Execution: ${execution?.id ?? '…'}`"
      :sub-title="`Workflow: ${workflow?.name || workflowName || 'Workflow'} | Record: ${execution?.recordId}`"
      @back="router.push('/admin/workflows')"
    >
      <template #extra>
        <Space>
          <Tag :color="statusColor">{{ execution?.status?.toUpperCase() }}</Tag>
          <Button @click="loadExecution" :loading="loading">Refresh</Button>
        </Space>
      </template>
    </PageHeader>

    <div class="execution-content">
      <Row :gutter="16">
        <!-- Left: Current State & Available Transitions -->
        <Col :span="12">
          <Card title="Current State" :bordered="false">
            <Spin :spinning="loading">
              <div class="state-info">
                <div class="state-name">
                  <h2>{{ execution?.currentState }}</h2>
                </div>
                <Descriptions :column="1" size="small" style="margin-top: 16px;">
                  <DescriptionsItem label="Status">
                    <Tag :color="statusColor">{{ execution?.status }}</Tag>
                  </DescriptionsItem>
                  <DescriptionsItem label="Started">
                    {{ formatDate(execution?.startedAt) }}
                  </DescriptionsItem>
                  <DescriptionsItem v-if="execution?.completedAt" label="Completed">
                    {{ formatDate(execution?.completedAt) }}
                  </DescriptionsItem>
                </Descriptions>

                <!-- Available Transitions -->
                <Divider />
                <h3 style="margin-bottom: 12px;">Available Actions</h3>
                <Space direction="vertical" style="width: 100%;" v-if="availableTransitions.length">
                  <Button
                    v-for="transition in availableTransitions"
                    :key="transition.code"
                    type="primary"
                    block
                    @click="showTransitionConfirm(transition)"
                    :loading="transitioningId === transition.code"
                    :disabled="!!transition.unavailableReason"
                    style="height: auto; white-space: normal"
                  >
                    {{ transition.name }}<span v-if="transition.unavailableReason"> — {{ transition.unavailableReason }}</span>
                  </Button>
                </Space>
                <Empty v-else description="No available transitions" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
              </div>
            </Spin>
          </Card>
        </Col>

        <!-- Right: Execution History -->
        <Col :span="12">
          <Card title="Execution History" :bordered="false">
            <Spin :spinning="loading">
              <Timeline v-if="history.length">
                <TimelineItem v-for="item in history" :key="item.version">
                  <strong>{{ item.fromState || 'Start' }} → {{ item.toState }}</strong>
                  <div>{{ item.transitionName }} by user {{ item.userId }}</div>
                  <time>{{ formatDate(item.transitionedAt) }}</time>
                </TimelineItem>
              </Timeline>
              <Empty v-else description="No transitions yet" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
            </Spin>
          </Card>
        </Col>
      </Row>
    </div>

    <!-- Transition Confirmation Modal -->
    <Modal
      v-model:open="showConfirmModal"
      title="Confirm Transition"
      @ok="handleTransition"
      @cancel="showConfirmModal = false"
      :confirm-loading="transitioning"
    >
      <p>Move from <strong>{{ execution?.currentState }}</strong> to <strong>{{ selectedTransition?.name }}</strong>?</p>
      <p v-if="selectedTransition?.description" class="transition-description">
        {{ selectedTransition.description }}
      </p>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Card,
  Descriptions,
  DescriptionsItem,
  Divider,
  Empty,
  Modal,
  PageHeader,
  Space,
  Spin,
  Tag,
  Timeline,
  TimelineItem,
  Button,
  Row,
  Col,
  message,
} from 'ant-design-vue'
import { getWorkflowExecutionApi, transitionWorkflowStateApi } from '../api/index'
import dayjs from 'dayjs'

interface Props {
  workflowId: string | number
  executionId: string | number
  workflowName?: string
}

const props = defineProps<Props>()
const router = useRouter()
let loadVersion = 0
const emit = defineEmits(['back', 'transitioned'])

const loading = ref(false)
const transitioning = ref(false)
const transitioningId = ref<string | null>(null)
const showConfirmModal = ref(false)

const execution = ref<any>(null)
const history = ref<any[]>([])
const workflow = ref<any>(null)
const selectedTransition = ref<any>(null)

const statusColor = computed(() => {
  switch (execution.value?.status) {
    case 'active': return 'blue'
    case 'completed': return 'green'
    case 'rejected': return 'red'
    case 'aborted': return 'orange'
    default: return 'default'
  }
})

const availableTransitions = computed(() => {
  if (!workflow.value || !execution.value || execution.value.status !== 'active') return []

  const currentStateName = execution.value.currentState
  const transitions = workflow.value.transitions || []

  return transitions.filter((t: any) => t.from_state === currentStateName)
})

const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return dayjs(date).format('MMM DD, YYYY HH:mm')
}

const loadExecution = async () => {
  const version = ++loadVersion
  execution.value = null
  workflow.value = null
  history.value = []
  showConfirmModal.value = false
  loading.value = true
  try {
    const response = await getWorkflowExecutionApi(props.workflowId, props.executionId)
    if (version !== loadVersion) return
    execution.value = response.execution
    history.value = response.history || []
    workflow.value = response.workflow
  } catch {
    if (version === loadVersion) message.error('Failed to load execution')
  } finally {
    if (version === loadVersion) loading.value = false
  }
}

const showTransitionConfirm = (transition: any) => {
  selectedTransition.value = transition
  showConfirmModal.value = true
}

const handleTransition = async () => {
  if (!selectedTransition.value || !execution.value || selectedTransition.value.unavailableReason) return
  const viewVersion = loadVersion

  transitioning.value = true
  transitioningId.value = selectedTransition.value.code

  try {
    const response = await transitionWorkflowStateApi(props.workflowId, props.executionId, {
      transitionCode: selectedTransition.value.code,
      version: execution.value.version,
    })
    if (viewVersion !== loadVersion) return

    execution.value = response
    showConfirmModal.value = false
    message.success(`Transitioned to ${selectedTransition.value.name}`)
    emit('transitioned', response)

    // Reload to get updated history
    await loadExecution()
  } catch (err: any) {
    if (viewVersion === loadVersion) {
      message.error(err.response?.data?.message || err.message || 'Failed to transition workflow')
      await loadExecution()
    }
  } finally {
    transitioning.value = false
    transitioningId.value = null
  }
}

watch(() => [props.workflowId, props.executionId], () => loadExecution())

onMounted(() => {
  loadExecution()
})
</script>

<style scoped>
.workflow-execution-page {
  padding: 24px;
}

.execution-content {
  margin-top: 24px;
}

.state-info {
  padding: 16px 0;
}

.state-name h2 {
  margin: 0;
  font-size: 28px;
  color: #1890ff;
}

.transition-description {
  margin-top: 12px;
  padding: 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}
</style>
