<script setup lang="ts">
import { ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { Clock, RotateCcw, Eye, User, Zap } from 'lucide-vue-next';
import { getRevisions, getRevision, revertToRevision } from '../api/index';

const props = defineProps<{
  open: boolean;
  pageId: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'reverted', data: any): void;
}>();

const loading = ref(false);
const reverting = ref(false);
const revisions = ref<any[]>([]);
const selectedRevision = ref<any>(null);
const previewContent = ref('');

async function loadRevisions() {
  if (!props.pageId) return;
  loading.value = true;
  try {
    const result = await getRevisions(props.pageId);
    revisions.value = result.data || result || [];
  } catch (err) {
    message.error('Failed to load revisions');
  } finally {
    loading.value = false;
  }
}

async function selectRevision(rev: any) {
  if (!props.pageId) return;
  selectedRevision.value = rev;
  try {
    const result = await getRevision(props.pageId, rev.id);
    const data = result.data || result;
    previewContent.value = data.contentHtml || '';
    if (!previewContent.value && data.content) {
      try {
        const parsed = JSON.parse(data.content);
        previewContent.value = `<pre style="white-space: pre-wrap; font-size: 12px;">${JSON.stringify(parsed, null, 2)}</pre>`;
      } catch {
        previewContent.value = `<pre>${data.content}</pre>`;
      }
    }
  } catch (err) {
    message.error('Failed to load revision');
  }
}

async function handleRevert() {
  if (!props.pageId || !selectedRevision.value) return;
  reverting.value = true;
  try {
    const result = await revertToRevision(props.pageId, selectedRevision.value.id);
    message.success(`Reverted to revision #${selectedRevision.value.revisionNumber}`);
    emit('reverted', result.data || result);
    emit('update:open', false);
  } catch (err) {
    message.error('Failed to revert');
  } finally {
    reverting.value = false;
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function close() {
  emit('update:open', false);
  selectedRevision.value = null;
  previewContent.value = '';
}

watch(() => props.open, (val) => {
  if (val) {
    loadRevisions();
    selectedRevision.value = null;
    previewContent.value = '';
  }
});
</script>

<template>
  <a-drawer
    :open="open"
    title="Revision History"
    :width="600"
    @close="close"
  >
    <template #extra>
      <a-button
        v-if="selectedRevision"
        type="primary"
        size="small"
        :loading="reverting"
        @click="handleRevert"
      >
        <template #icon><RotateCcw :size="14" /></template>
        Revert
      </a-button>
    </template>

    <a-spin :spinning="loading">
      <div v-if="!revisions.length && !loading" class="text-center py-12 text-gray-400">
        <Clock :size="48" class="mx-auto mb-3 opacity-50" />
        <p class="text-sm">No revisions yet</p>
        <p class="text-xs">Revisions are created automatically when you save changes</p>
      </div>

      <div v-else class="flex gap-4" style="min-height: 400px;">
        <!-- Revision List -->
        <div class="w-52 flex-shrink-0 border-r pr-4">
          <div class="text-xs font-semibold text-gray-400 uppercase mb-3">{{ revisions.length }} Revisions</div>
          <div class="space-y-1">
            <button
              v-for="rev in revisions"
              :key="rev.id"
              class="revision-item"
              :class="{ active: selectedRevision?.id === rev.id }"
              @click="selectRevision(rev)"
            >
              <div class="flex items-center gap-1.5">
                <Zap v-if="rev.isAutoSave" :size="12" class="text-yellow-500" />
                <span class="font-medium text-xs">#{{ rev.revisionNumber }}</span>
              </div>
              <div class="text-[10px] text-gray-400 mt-0.5">{{ formatDate(rev.createdAt) }}</div>
              <div v-if="rev.changeDescription" class="text-[10px] text-gray-500 truncate mt-0.5">{{ rev.changeDescription }}</div>
            </button>
          </div>
        </div>

        <!-- Preview -->
        <div class="flex-1 min-w-0">
          <div v-if="!selectedRevision" class="text-center py-12 text-gray-400">
            <Eye :size="32" class="mx-auto mb-2 opacity-50" />
            <p class="text-sm">Select a revision to preview</p>
          </div>
          <div v-else>
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium">Revision #{{ selectedRevision.revisionNumber }}</span>
              <a-tag v-if="selectedRevision.isAutoSave" color="gold" size="small">Auto-save</a-tag>
            </div>
            <div class="border rounded-lg p-4 bg-gray-50 overflow-auto" style="max-height: 500px;">
              <div v-html="previewContent" class="prose prose-sm max-w-none" />
            </div>
          </div>
        </div>
      </div>
    </a-spin>
  </a-drawer>
</template>

<style scoped>
.revision-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
}
.revision-item:hover {
  background: #f3f4f6;
}
.revision-item.active {
  background: #eff6ff;
  border-color: #1677ff;
}
</style>
