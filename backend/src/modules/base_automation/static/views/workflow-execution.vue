<template>
  <div class="workflow-execution-page">
    <PageHeader
      :title="`Execution: ${execution?.id?.substring(0, 8)}`"
      :sub-title="`Workflow: ${workflowName} | Record: ${execution?.recordId}`"
      @back="handleBack"
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
                    :key="transition.id"
                    type="primary"
                    block
                    @click="showTransitionConfirm(transition)"
                    :loading="transitioningId === transition.id"
                  >
                    {{ transition.name }}
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
              <Timeline v-if="history.length" :items="timelineItems" />
              <Empty v-else description="No transitions yet" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
            </Spin>
          </Card>
        </Col>
      </Row>
    </div>

    <!-- Transition Confirmation Modal -->
    <Modal
      v-model:visible="showConfirmModal"
      title="Confirm Transition"
      @ok="handleTransition"
      @cancel="showConfirmModal = false"
      :ok-loading="transitioning"
    >
      <p>Move from <strong>{{ execution?.currentState }}</strong> to <strong>{{ selectedTransition?.name }}</strong>?</p>
      <p v-if="selectedTransition?.description" class="transition-description">
        {{ selectedTransition.description }}
      </p>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
  Button,
  Row,
  Col,
  message,
} from 'ant-design-vue'
import { get, post } from '#/api/request'
import dayjs from 'dayjs'

interface Props {
  workflowId: string | number
  executionId: string | number
  workflowName?: string
}

const props = defineProps<Props>()
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
  if (!workflow.value || !execution.value) return []

  const currentStateName = execution.value.currentState
  const transitions = workflow.value.transitions || []

  return transitions.filter((t: any) => t.from === currentStateName)
})

const timelineItems = computed(() => {
  return history.value.map((item: any) => ({
    label: formatDate(item.transitionedAt),
    title: `${item.fromState} → ${item.toState}`,
    description: `${item.transitionName}${item.userId ? ` by user ${item.userId}` : ' (automatic)'}`,
  }))
})

const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return dayjs(date).format('MMM DD, YYYY HH:mm')
}

const loadExecution = async () => {
  loading.value = true
  try {
    const response = await get(`/base_automation/workflows/${props.workflowId}/executions/${props.executionId}`)
    execution.value = response.execution
    history.value = response.history || []

    // Load workflow for transitions
    const wf = await get(`/base_automation/workflows/${props.workflowId}`)
    workflow.value = wf
  } catch (err) {
    message.error('Failed to load execution')
    console.error(err)
  } finally {
    loading.value = false
  }
}

const showTransitionConfirm = (transition: any) => {
  selectedTransition.value = transition
  showConfirmModal.value = true
}

const handleTransition = async () => {
  if (!selectedTransition.value) return

  transitioning.value = true
  transitioningId.value = selectedTransition.value.id

  try {
    const response = await post(
      `/base_automation/workflows/${props.workflowId}/executions/${props.executionId}/transition`,
      {
        toState: selectedTransition.value.to,
        transitionName: selectedTransition.value.name,
      }
    )

    execution.value = response
    showConfirmModal.value = false
    message.success(`Transitioned to ${selectedTransition.value.name}`)
    emit('transitioned', response)

    // Reload to get updated history
    setTimeout(() => loadExecution(), 500)
  } catch (err: any) {
    message.error(err.message || 'Failed to transition workflow')
  } finally {
    transitioning.value = false
    transitioningId.value = null
  }
}

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
