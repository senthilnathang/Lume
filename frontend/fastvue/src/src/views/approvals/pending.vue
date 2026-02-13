<script setup lang="ts">
import { CheckCircleOutlined } from '@ant-design/icons-vue'
import ApprovalInbox from '#/components/approvals/ApprovalInbox.vue'

const handleApproved = () => {
  // Can emit events to parent or show notifications
}

const handleRejected = () => {
  // Handle rejection events
}

const handleDelegated = () => {
  // Handle delegation events
}
</script>

<template>
  <div class="approvals-page">
    <a-page-header
      title="Approvals"
      sub-title="Review and action pending approval requests"
    >
      <template #avatar>
        <a-avatar :style="{ backgroundColor: '#1890ff' }">
          <template #icon><CheckCircleOutlined /></template>
        </a-avatar>
      </template>
    </a-page-header>

    <a-card>
      <ApprovalInbox
        :show-history="true"
        @approved="handleApproved"
        @rejected="handleRejected"
        @delegated="handleDelegated"
      />
    </a-card>
  </div>
</template>

<script lang="ts">
export default {
  name: 'ApprovalsPage',
}
</script>

<style scoped>
.approvals-page {
  padding: 0;
}
</style>
