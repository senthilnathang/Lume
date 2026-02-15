<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import { ListOrdered, Plus, RefreshCw, Play } from 'lucide-vue-next';
import { getSequences, createSequence, getNextSequenceNumber, type Sequence } from '@modules/base/static/api/settings';

defineOptions({ name: 'SequencesView' });

const loading = ref(false);
const sequences = ref<Sequence[]>([]);
const showModal = ref(false);
const formLoading = ref(false);

const form = reactive({
  name: '', code: '', prefix: '', suffix: '',
  padding: 5, nextNumber: 1, increment: 1,
  modelName: '', fieldName: '', isActive: true,
});

const columns: ColumnsType = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Code', key: 'code', width: 130 },
  { title: 'Prefix', dataIndex: 'prefix', key: 'prefix', width: 90 },
  { title: 'Suffix', dataIndex: 'suffix', key: 'suffix', width: 90 },
  { title: 'Padding', dataIndex: 'padding', key: 'padding', width: 80 },
  { title: 'Next #', dataIndex: 'nextNumber', key: 'nextNumber', width: 80 },
  { title: 'Increment', dataIndex: 'increment', key: 'increment', width: 90 },
  { title: 'Model', dataIndex: 'modelName', key: 'modelName', width: 120 },
  { title: 'Active', key: 'active', width: 80 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

async function loadSequences() {
  loading.value = true;
  try {
    const res = await getSequences();
    sequences.value = Array.isArray(res) ? res : (res as any)?.data || [];
  } catch { sequences.value = []; }
  finally { loading.value = false; }
}

function openModal() {
  Object.assign(form, { name: '', code: '', prefix: '', suffix: '', padding: 5, nextNumber: 1, increment: 1, modelName: '', fieldName: '', isActive: true });
  showModal.value = true;
}

async function handleSubmit() {
  if (!form.name || !form.code) { message.warning('Name and Code are required'); return; }
  formLoading.value = true;
  try {
    await createSequence({ ...form, modelName: form.modelName || undefined, fieldName: form.fieldName || undefined });
    message.success('Sequence created');
    showModal.value = false;
    await loadSequences();
  } catch (e: any) { message.error(e?.message || 'Failed'); }
  finally { formLoading.value = false; }
}

async function handleGetNext(seq: Sequence) {
  try {
    const res = await getNextSequenceNumber(seq.code);
    const num = (res as any)?.number ?? (res as any)?.data?.number ?? res;
    message.info(`Next number for "${seq.code}": ${num}`);
    await loadSequences();
  } catch (e: any) { message.error(e?.message || 'Failed to get next number'); }
}

function formatPreview(seq: Sequence): string {
  const num = String(seq.nextNumber).padStart(seq.padding, '0');
  return `${seq.prefix || ''}${num}${seq.suffix || ''}`;
}

onMounted(() => { loadSequences(); });
</script>

<template>
  <div class="sequences-page p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2"><ListOrdered :size="24" /> Sequences</h1>
        <p class="text-gray-500 m-0">Manage auto-incrementing number sequences for records</p>
      </div>
      <div class="flex gap-2">
        <a-button @click="loadSequences" :loading="loading"><template #icon><RefreshCw :size="14" /></template>Refresh</a-button>
        <a-button type="primary" @click="openModal"><template #icon><Plus :size="14" /></template>Add Sequence</a-button>
      </div>
    </div>

    <a-table :columns="columns" :data-source="sequences" :loading="loading" row-key="id" size="middle" :pagination="{ pageSize: 20 }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'code'">
          <a-tag color="blue">{{ record.code }}</a-tag>
        </template>
        <template v-else-if="column.key === 'active'">
          <a-tag :color="record.isActive ? 'green' : 'default'">{{ record.isActive ? 'Yes' : 'No' }}</a-tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="actions-cell flex items-center gap-1">
            <a-tooltip :title="`Preview: ${formatPreview(record)}`">
              <a-button type="text" size="small" @click="handleGetNext(record)">
                <template #icon><Play :size="15" /></template>
              </a-button>
            </a-tooltip>
          </div>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="showModal" title="Create Sequence" @ok="handleSubmit" :confirm-loading="formLoading">
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="Name"><a-input v-model:value="form.name" placeholder="Sequence name" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="Code"><a-input v-model:value="form.code" placeholder="e.g. DON" /></a-form-item></a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="8"><a-form-item label="Prefix"><a-input v-model:value="form.prefix" placeholder="e.g. DON-" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="Suffix"><a-input v-model:value="form.suffix" placeholder="e.g. -2024" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="Padding"><a-input-number v-model:value="form.padding" :min="1" :max="20" style="width:100%" /></a-form-item></a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="Next Number"><a-input-number v-model:value="form.nextNumber" :min="1" style="width:100%" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="Increment"><a-input-number v-model:value="form.increment" :min="1" style="width:100%" /></a-form-item></a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="Model Name"><a-input v-model:value="form.modelName" placeholder="Optional model" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="Field Name"><a-input v-model:value="form.fieldName" placeholder="Optional field" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="Active"><a-switch v-model:checked="form.isActive" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.sequences-page { min-height: 100%; }

:deep(.actions-cell .ant-btn) {
  opacity: 0.55;
  transition: opacity 0.15s;
}
:deep(.ant-table-row:hover .actions-cell .ant-btn) {
  opacity: 1;
}
</style>
