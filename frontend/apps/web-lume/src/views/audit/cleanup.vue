<script lang="ts" setup>
import { ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { Trash2, AlertTriangle, ShieldAlert, Clock } from 'lucide-vue-next';
import { cleanupLogs, getAuditLogs } from '@/api/audit';

defineOptions({ name: 'AuditCleanupView' });

const daysToKeep = ref(90);
const loading = ref(false);
const lastResult = ref<{ deleted_count: number } | null>(null);
const totalLogs = ref(0);
const loadingStats = ref(false);

async function loadStats() {
  loadingStats.value = true;
  try {
    const res = await getAuditLogs({ limit: 1 });
    const data = Array.isArray(res) ? res : (res as any);
    totalLogs.value = data?.total || data?.length || 0;
  } catch { totalLogs.value = 0; }
  finally { loadingStats.value = false; }
}

function confirmCleanup() {
  Modal.confirm({
    title: 'Confirm Audit Log Cleanup',
    icon: () => null,
    content: `This will permanently delete all audit logs older than ${daysToKeep.value} days. This action cannot be undone.`,
    okType: 'danger',
    okText: 'Delete Old Logs',
    cancelText: 'Cancel',
    async onOk() {
      loading.value = true;
      try {
        const res = await cleanupLogs(daysToKeep.value);
        const count = (res as any)?.deleted_count ?? (res as any)?.data?.deleted_count ?? 0;
        lastResult.value = { deleted_count: count };
        message.success(`Successfully deleted ${count} old audit log(s)`);
        await loadStats();
      } catch (e: any) {
        message.error(e?.message || 'Cleanup failed');
      } finally {
        loading.value = false;
      }
    },
  });
}

loadStats();
</script>

<template>
  <div class="cleanup-page p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold mb-1 flex items-center gap-2"><Trash2 :size="24" /> Audit Log Cleanup</h1>
      <p class="text-gray-500 m-0">Archive and delete old audit log entries to manage storage</p>
    </div>

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :lg="12">
        <a-card title="Cleanup Settings">
          <a-alert
            type="warning"
            show-icon
            class="mb-6"
            message="Destructive Action"
            description="Deleted audit logs cannot be recovered. Make sure you have any required backups before proceeding."
          >
            <template #icon><AlertTriangle :size="18" /></template>
          </a-alert>

          <a-form layout="vertical">
            <a-form-item label="Days to Keep">
              <a-input-number
                v-model:value="daysToKeep"
                :min="7"
                :max="365"
                style="width: 200px"
                addon-after="days"
              />
              <div class="text-xs text-gray-400 mt-1">
                Logs older than {{ daysToKeep }} days will be permanently deleted (min: 7, max: 365)
              </div>
            </a-form-item>

            <a-form-item>
              <a-button type="primary" danger :loading="loading" @click="confirmCleanup">
                <template #icon><Trash2 :size="14" /></template>
                Run Cleanup
              </a-button>
            </a-form-item>
          </a-form>

          <div v-if="lastResult" class="mt-4">
            <a-result
              :status="lastResult.deleted_count > 0 ? 'success' : 'info'"
              :title="lastResult.deleted_count > 0 ? `${lastResult.deleted_count} log(s) deleted` : 'No logs to delete'"
              :sub-title="lastResult.deleted_count > 0 ? 'Old audit logs have been permanently removed.' : 'No audit logs matched the specified age criteria.'"
            />
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="12">
        <a-card title="Quick Info" :loading="loadingStats">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="Retention Period">
              <a-tag color="blue"><Clock :size="12" class="inline mr-1" style="vertical-align: -1px" />{{ daysToKeep }} days</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="Cutoff Date">
              {{ new Date(Date.now() - daysToKeep * 86400000).toLocaleDateString() }}
            </a-descriptions-item>
          </a-descriptions>

          <div class="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 class="font-medium mb-2 flex items-center gap-2"><ShieldAlert :size="16" /> Best Practices</h4>
            <ul class="text-sm text-gray-500 space-y-1 pl-4 list-disc m-0">
              <li>Export audit logs before cleanup if compliance requires retention</li>
              <li>Keep at least 90 days of logs for security auditing</li>
              <li>Schedule regular cleanups to prevent database bloat</li>
              <li>Critical security events should be backed up separately</li>
            </ul>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
.cleanup-page { min-height: 100%; }
</style>
