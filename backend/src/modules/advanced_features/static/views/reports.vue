<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { BarChart3, Play, Plus, Trash2 } from 'lucide-vue-next';
import {
  getReports, createReport, deleteReport, runReport,
} from '@modules/advanced_features/static/api/index';

defineOptions({ name: 'ReportsView' });

interface Report {
  id: number;
  name: string;
  code: string;
  baseEntity?: string;
  base_entity?: string;
  reportType?: string;
  report_type?: string;
  status?: string;
}

interface ResultRow extends Record<string, unknown> { id?: number }

const loading = ref(false);
const reports = ref<Report[]>([]);
const drawer = ref(false);
const running = ref(false);
const results = ref<{ report?: { name: string }; total: number; rows: ResultRow[] } | null>(null);
const resultsOpen = ref(false);
const form = ref({ name: '', code: '', baseEntity: '', reportType: 'tabular', description: '', fields: '', groupBy: '' });

const resultColumns = computed(() => {
  const rows = results.value?.rows || [];
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]).filter((k) => k !== 'id');
  return keys.map((k) => ({ title: k, dataIndex: k, key: k }));
});

async function load() {
  loading.value = true;
  try {
    const res = await getReports({ limit: 100 });
    const data = res?.data || res;
    reports.value = Array.isArray(data) ? data : data?.rows || [];
  } catch {
    message.error('Failed to load reports');
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!form.value.name || !form.value.code || !form.value.baseEntity) {
    message.warning('Name, code, and base entity are required');
    return;
  }
  try {
    await createReport({
      name: form.value.name,
      code: form.value.code,
      baseEntity: form.value.baseEntity,
      reportType: form.value.reportType,
      description: form.value.description,
      queryConfig: {
        fields: form.value.fields.split(',').map((s) => s.trim()).filter(Boolean).map((f) => ({ field: f })),
      },
      groupingConfig: form.value.groupBy ? { groupBy: form.value.groupBy, aggregates: [] } : {},
    });
    message.success('Report created');
    drawer.value = false;
    form.value = { name: '', code: '', baseEntity: '', reportType: 'tabular', description: '', fields: '', groupBy: '' };
    await load();
  } catch (e: unknown) {
    message.error((e as Error).message || 'Failed to create report');
  }
}

async function run(id: number) {
  running.value = true;
  try {
    const res = await runReport(id);
    results.value = res?.data || res;
    resultsOpen.value = true;
  } catch (e: unknown) {
    message.error((e as Error).message || 'Failed to run report');
  } finally {
    running.value = false;
  }
}

function remove(id: number) {
  Modal.confirm({
    title: 'Delete this report?',
    onOk: async () => {
      await deleteReport(id);
      message.success('Report deleted');
      await load();
    },
  });
}

function entityOf(r: Report): string {
  return r.baseEntity || r.base_entity || '';
}

onMounted(load);
</script>

<template>
  <div class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <BarChart3 :size="24" />
          Analytics Reports
        </h1>
        <p class="text-gray-500 m-0">Tabular and grouped reports over any entity</p>
      </div>
      <a-button type="primary" @click="drawer = true">
        <template #icon><Plus :size="14" /></template>
        Add Report
      </a-button>
    </div>

    <a-table :data-source="reports" :loading="loading" row-key="id" size="middle">
      <a-table-column title="Name" data-index="name" key="name" />
      <a-table-column title="Code" data-index="code" key="code" />
      <a-table-column title="Entity" key="entity">
        <template #default="{ record }">{{ entityOf(record) }}</template>
      </a-table-column>
      <a-table-column title="Type" data-index="reportType" key="type" />
      <a-table-column title="Actions" key="actions">
        <template #default="{ record }">
          <a-space>
            <a-button type="link" size="small" :loading="running" @click="run(record.id)">
              <template #icon><Play :size="12" /></template>Run
            </a-button>
            <a-button type="link" size="small" danger @click="remove(record.id)">
              <template #icon><Trash2 :size="12" /></template>
            </a-button>
          </a-space>
        </template>
      </a-table-column>
    </a-table>

    <a-drawer v-model:open="drawer" title="Add Report" width="560" placement="right">
      <a-form layout="vertical">
        <a-form-item label="Name" required><a-input v-model:value="form.name" /></a-form-item>
        <a-form-item label="Code" required><a-input v-model:value="form.code" placeholder="e.g. won_deals" /></a-form-item>
        <a-form-item label="Base entity" required><a-input v-model:value="form.baseEntity" placeholder="e.g. deal" /></a-form-item>
        <a-form-item label="Type">
          <a-select v-model:value="form.reportType">
            <a-select-option value="tabular">Tabular</a-select-option>
            <a-select-option value="summary">Summary</a-select-option>
            <a-select-option value="chart">Chart</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Fields (comma-separated, empty = all)">
          <a-input v-model:value="form.fields" placeholder="e.g. title, amount, stage" />
        </a-form-item>
        <a-form-item label="Group by (optional)">
          <a-input v-model:value="form.groupBy" placeholder="e.g. stage" />
        </a-form-item>
        <a-form-item label="Description"><a-textarea v-model:value="form.description" :rows="2" /></a-form-item>
        <a-form-item><a-button type="primary" block @click="save">Create</a-button></a-form-item>
      </a-form>
    </a-drawer>

    <a-drawer v-model:open="resultsOpen" :title="results?.report?.name || 'Results'" width="720" placement="right">
      <p class="text-gray-500">{{ results?.total || 0 }} rows</p>
      <a-table :data-source="results?.rows || []" :pagination="{ pageSize: 20 }" row-key="id" size="small">
        <a-table-column v-for="col in resultColumns" :key="col.key" :title="col.title" :data-index="col.dataIndex" />
      </a-table>
    </a-drawer>
  </div>
</template>
