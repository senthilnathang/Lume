<script setup lang="ts">
/**
 * ReadStatusBadge - Shows read status of a message
 *
 * Displays:
 * - Single check for sent
 * - Double check for read
 * - Hover tooltip showing who read it
 */
import { ref, computed } from 'vue';
import { Popover } from 'ant-design-vue';
import { CheckIcon, CheckCheckIcon, EyeIcon } from 'lucide-vue-next';
import { getMessageReadReceiptsApi, type MessagesApi } from '#/api/core/messages';
import { formatDistanceToNow } from 'date-fns';

const props = defineProps<{
  messageId: number;
  isOwnMessage: boolean;
  readCount?: number;
}>();

const loading = ref(false);
const receipts = ref<MessagesApi.ReadReceipt[]>([]);
const showDetails = ref(false);

const hasBeenRead = computed(() => {
  return (props.readCount ?? 0) > 0 || receipts.value.length > 0;
});

const displayCount = computed(() => {
  return props.readCount ?? receipts.value.length;
});

async function loadReceipts() {
  if (loading.value || receipts.value.length > 0) return;

  loading.value = true;
  try {
    const response = await getMessageReadReceiptsApi(props.messageId);
    receipts.value = response.receipts || [];
  } catch (error) {
    console.error('Failed to load read receipts:', error);
  } finally {
    loading.value = false;
  }
}

function formatTime(dateStr: string) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}
</script>

<template>
  <div v-if="isOwnMessage" class="read-status-badge">
    <Popover
      v-model:open="showDetails"
      trigger="hover"
      placement="top"
      @openChange="(open) => open && loadReceipts()"
    >
      <template #content>
        <div class="read-receipts-popover">
          <div v-if="loading" class="loading">Loading...</div>
          <div v-else-if="receipts.length === 0" class="empty">
            No one has read this yet
          </div>
          <div v-else class="receipts-list">
            <div class="header">
              <EyeIcon class="h-4 w-4" />
              <span>Read by {{ receipts.length }}</span>
            </div>
            <div
              v-for="receipt in receipts"
              :key="receipt.user_id"
              class="receipt-item"
            >
              <div class="avatar">
                {{ (receipt.user?.full_name || 'U')[0]!.toUpperCase() }}
              </div>
              <div class="info">
                <span class="name">{{ receipt.user?.full_name || 'Unknown' }}</span>
                <span class="time">{{ formatTime(receipt.read_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <span class="status-icon" :class="{ read: hasBeenRead }">
        <CheckCheckIcon v-if="hasBeenRead" class="h-4 w-4" />
        <CheckIcon v-else class="h-4 w-4" />
        <span v-if="displayCount > 0" class="count">{{ displayCount }}</span>
      </span>
    </Popover>
  </div>
</template>

<style scoped>
.read-status-badge {
  display: inline-flex;
  align-items: center;
}

.status-icon {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--ant-color-text-quaternary);
  cursor: pointer;
  transition: color 0.2s;
}

.status-icon.read {
  color: var(--ant-color-primary);
}

.status-icon:hover {
  color: var(--ant-color-primary-hover);
}

.count {
  font-size: 10px;
  font-weight: 500;
}

.read-receipts-popover {
  min-width: 180px;
  max-width: 250px;
}

.loading,
.empty {
  padding: 8px 0;
  color: var(--ant-color-text-secondary);
  font-size: 12px;
  text-align: center;
}

.receipts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--ant-color-border);
  font-size: 12px;
  font-weight: 500;
  color: var(--ant-color-text-secondary);
}

.receipt-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--ant-color-primary-bg);
  color: var(--ant-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 500;
}

.info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 12px;
  font-weight: 500;
  color: var(--ant-color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.time {
  font-size: 10px;
  color: var(--ant-color-text-secondary);
}
</style>
