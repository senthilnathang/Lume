<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { message } from 'ant-design-vue';
import { listApprovalRequests, approveTaskApi, rejectTaskApi, type ApprovalRequestView } from '../api';

const view = ref<'pending' | 'history'>('pending');
const items = ref<ApprovalRequestView[]>([]);
const nextCursor = ref<number | null>(null);
const loading = ref(false);
const failed = ref(false);
const selected = ref<ApprovalRequestView | null>(null);
const decision = ref<'approve' | 'reject'>('approve');
const reason = ref('');
const processing = ref(false);
const columns = [
  { title: 'Request', key: 'request' }, { title: 'Record', key: 'record' },
  { title: 'Status / Steps', key: 'steps' }, { title: 'Actions', key: 'actions' },
];
async function load(more = false) {
  if (loading.value) return;
  loading.value = true;
  failed.value = false;
  if (!more) { items.value = []; nextCursor.value = null; }
  try {
    const page = await listApprovalRequests(view.value, more ? nextCursor.value ?? undefined : undefined);
    items.value = more ? [...items.value, ...page.items] : page.items;
    nextCursor.value = page.nextCursor;
  } catch (error: any) {
    failed.value = true;
    message.error(error?.message || 'Could not load approval requests');
  } finally { loading.value = false; }
}
function open(row: ApprovalRequestView, action: 'approve' | 'reject') {
  selected.value = row;
  decision.value = action;
  reason.value = '';
}
async function submit() {
  if (!selected.value || processing.value) return;
  if (decision.value === 'reject' && !reason.value.trim()) { message.warning('Enter a rejection reason'); return; }
  processing.value = true;
  try {
    const row = selected.value;
    if (decision.value === 'approve') await approveTaskApi(row.id, { stepIndex: row.currentStep });
    else await rejectTaskApi(row.id, { stepIndex: row.currentStep, reason: reason.value.trim() });
    selected.value = null;
    message.success(decision.value === 'approve' ? 'Approval recorded' : 'Request rejected');
    await load();
  } catch (error: any) { message.error(error?.message || 'Decision failed. Refresh to check the current step.'); }
  finally { processing.value = false; }
}
onMounted(() => load());
</script>

<template>
  <div class="p-6">
    <h1 class="text-xl font-semibold mb-4">Approval requests</h1>
    <div class="flex gap-4 mb-4">
      <a-radio-group v-model:value="view" :disabled="loading || processing" @change="load()">
        <a-radio-button value="pending">Awaiting my decision</a-radio-button>
        <a-radio-button value="history">Completed requests</a-radio-button>
      </a-radio-group>
      <a-button :loading="loading" :disabled="processing" @click="load()">Refresh</a-button>
    </div>
    <a-alert v-if="failed" type="error" message="Requests could not be loaded. Refresh to try again." class="mb-4" />
    <a-table :columns="columns" :data-source="items" :loading="loading" :pagination="false" row-key="id">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'request'">#{{ record.id }} · Chain #{{ record.chainId }}</template>
        <template v-else-if="column.key === 'record'">Entity #{{ record.recordEntityId }} · Record #{{ record.recordId }}</template>
        <template v-else-if="column.key === 'steps'">
          <a-tag>{{ record.status }}</a-tag>
          <div v-for="(step, index) in record.stepsData" :key="index">
            {{ step.name || `Step ${index + 1}` }}: {{ step.status }}
            <span v-if="step.actedBy"> · User #{{ step.actedBy }}</span>
            <span v-if="step.actedAt"> · {{ new Date(step.actedAt).toLocaleString() }}</span>
            <div v-if="step.reason">{{ step.reason }}</div>
          </div>
        </template>
        <template v-else-if="column.key === 'actions' && view === 'pending'">
          <a-space>
            <a-button type="primary" :disabled="loading || processing" @click="open(record, 'approve')">Approve</a-button>
            <a-button danger :disabled="loading || processing" @click="open(record, 'reject')">Reject</a-button>
          </a-space>
        </template>
      </template>
    </a-table>
    <a-button v-if="nextCursor !== null" class="mt-4" :loading="loading" :disabled="processing" @click="load(true)">Load more</a-button>
    <a-modal :open="!!selected" :title="decision === 'approve' ? 'Approve request' : 'Reject request'"
      :confirm-loading="processing" :closable="!processing" :mask-closable="!processing"
      :cancel-button-props="{ disabled: processing }" @ok="submit" @cancel="selected = null">
      <p>Request #{{ selected?.id }}, step {{ (selected?.currentStep ?? 0) + 1 }}</p>
      <a-textarea v-if="decision === 'reject'" v-model:value="reason" :maxlength="2000" :rows="4" placeholder="Rejection reason" />
    </a-modal>
  </div>
</template>
