<script setup lang="ts">
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
  <div class="approval-history">
    <ApprovalInbox
      :show-history="true"
      @approved="handleApproved"
      @rejected="handleRejected"
      @delegated="handleDelegated"
    />
  </div>
</template>

<style scoped>
.approval-history {
  padding: 24px;
}
</style>