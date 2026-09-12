<template>
  <div class="activity-timeline">
    <div v-if="title" class="activity-title">{{ title }}</div>
    <div v-if="showFilters" class="activity-filters">
      <a-select
        :value="selectedAction"
        size="small"
        style="width: 160px"
        allow-clear
        placeholder="All actions"
        @change="(v: string) => { selectedAction = v; load(); }"
      >
        <a-select-option v-for="action in actionOptions" :key="action" :value="action">{{ action }}</a-select-option>
      </a-select>
    </div>
    <a-spin :spinning="loading">
      <a-empty v-if="!loading && !items.length" description="No activity yet" />
      <a-timeline v-else :mode="compact ? undefined : 'left'">
        <a-timeline-item v-for="item in items" :key="item.id" :color="colorFor(item.action)">
          <div class="activity-row">
            <span class="activity-action">{{ item.action }}</span>
            <span v-if="item.model" class="activity-model">{{ item.model }} #{{ item.recordId || '' }}</span>
            <span v-if="item.userId" class="activity-user">user {{ item.userId }}</span>
          </div>
          <div class="activity-time">{{ formatTime(item.createdAt) }}</div>
        </a-timeline-item>
      </a-timeline>
    </a-spin>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { get } from '@/api/request';

defineOptions({ name: 'ActivityTimeline' });

interface AuditEntry {
  id: number;
  action: string;
  model?: string | null;
  recordId?: string | null;
  userId?: number | null;
  createdAt?: string | null;
}

const props = withDefaults(defineProps<{
  userId?: number | null;
  action?: string | null;
  model?: string | null;
  limit?: number;
  showFilters?: boolean;
  title?: string;
  compact?: boolean;
}>(), {
  userId: null,
  action: null,
  model: null,
  limit: 50,
  showFilters: true,
  title: 'Activity Timeline',
  compact: false,
});

const items = ref<AuditEntry[]>([]);
const loading = ref(false);
const selectedAction = ref<string | undefined>(props.action || undefined);
const actionOptions = ['create', 'update', 'delete', 'login', 'logout', 'export'];

function colorFor(action: string): string {
  switch (action) {
    case 'create': return 'green';
    case 'update': return 'blue';
    case 'delete': return 'red';
    case 'login': return 'cyan';
    case 'logout': return 'gray';
    case 'export': return 'purple';
    default: return 'blue';
  }
}

function formatTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

async function load() {
  loading.value = true;
  try {
    const params: Record<string, unknown> = { limit: props.limit };
    if (props.userId) params.user_id = props.userId;
    if (selectedAction.value) params.action = selectedAction.value;
    if (props.model) params.resource_type = props.model;
    const res = await get<{ rows?: AuditEntry[]; data?: AuditEntry[] } | AuditEntry[]>('/audit', params);
    const rows = Array.isArray(res) ? res : res.rows || res.data || [];
    items.value = Array.isArray(rows) ? rows : [];
  } catch {
    items.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
defineExpose({ reload: load });
</script>
<style scoped>
.activity-timeline {
  background: #fff;
}
.activity-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}
.activity-filters {
  margin-bottom: 12px;
}
.activity-row {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 13px;
}
.activity-action {
  font-weight: 600;
  text-transform: capitalize;
}
.activity-model,
.activity-user {
  color: #999;
}
.activity-time {
  font-size: 11px;
  color: #bbb;
}
</style>
