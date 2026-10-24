<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { LayoutTemplate, Plus, Trash2, ArrowUp, ArrowDown, Download, Upload } from 'lucide-vue-next';
import {
  getSchemaGraph, listEntityRecords, getEntityRecord,
} from '@modules/base_customization/static/api/index';

defineOptions({ name: 'RecordPageBuilderView' });

type Section =
  | { id: string; type: 'highlights'; fields: string[] }
  | { id: string; type: 'path'; field: string }
  | { type: 'details'; id: string; fields: string[] }
  | { id: string; type: 'related-list'; title: string; targetEntity: number | null; filterField: string };

interface GraphField { id: number; name: string; label: string; type: string; required: boolean }
interface GraphEntity { id: number; name: string; label: string; fields: GraphField[] }

const loading = ref(false);
const entities = ref<GraphEntity[]>([]);
const entityId = ref<number | null>(null);
const sections = ref<Section[]>([]);
const recordId = ref<number | null>(null);
const recordOptions = ref<{ id: number; label: string }[]>([]);
const recordData = ref<Record<string, unknown>>({});
const related = ref<Record<string, { loading: boolean; rows: { id: number; data: Record<string, unknown> }[] }>>({});
const pathSteps = ref<string[]>([]);

const entity = computed(() => entities.value.find((e) => e.id === entityId.value) || null);
const storageKey = computed(() => `lume-record-page-${entityId.value}`);
const uid = () => `s_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e5)}`;

function fieldLabel(name: string): string {
  return entity.value?.fields.find((f) => f.name === name)?.label || name;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

async function loadGraph() {
  loading.value = true;
  try {
    const res = await getSchemaGraph();
    const data = res?.data || res;
    entities.value = data?.entities || [];
    if (!entityId.value && entities.value.length) {
      entityId.value = entities.value[0].id;
    }
  } catch {
    message.error('Failed to load entities');
  } finally {
    loading.value = false;
  }
}

function loadSaved() {
  if (!entityId.value) return;
  try {
    const raw = localStorage.getItem(storageKey.value);
    const parsed = raw ? JSON.parse(raw) : null;
    sections.value = Array.isArray(parsed?.sections) ? parsed.sections : defaultSections();
  } catch {
    sections.value = defaultSections();
  }
  recordId.value = null;
  recordData.value = {};
}

function defaultSections(): Section[] {
  const names = (entity.value?.fields || []).slice(0, 6).map((f) => f.name);
  return [
    { id: uid(), type: 'highlights', fields: names.slice(0, 4) },
    { id: uid(), type: 'details', fields: names },
  ];
}

function persist() {
  if (!entityId.value) return;
  localStorage.setItem(storageKey.value, JSON.stringify({ sections: sections.value }));
}

async function loadRecordOptions() {
  if (!entityId.value) return;
  try {
    const res = await listEntityRecords(entityId.value, { limit: 50 });
    const rows = res?.data || res || [];
    recordOptions.value = (Array.isArray(rows) ? rows : []).map((r: { id: number; data?: Record<string, unknown> }) => ({
      id: r.id,
      label: `#${r.id} ${String(r.data?.name || r.data?.title || '')}`.trim(),
    }));
  } catch {
    message.error('Failed to load records');
  }
}

async function loadPreview() {
  if (!entityId.value || !recordId.value) {
    recordData.value = {};
    return;
  }
  try {
    const res = await getEntityRecord(entityId.value, recordId.value);
    const rec = res?.data || res;
    recordData.value = rec?.data || {};
  } catch {
    message.error('Failed to load record');
  }
}

async function loadRelated(section: Extract<Section, { type: 'related-list' }>) {
  if (!section.targetEntity || !section.filterField || !recordId.value) return;
  related.value[section.id] = { loading: true, rows: [] };
  try {
    const filters = JSON.stringify([{ field: section.filterField, value: recordId.value, operator: 'equals' }]);
    const res = await listEntityRecords(section.targetEntity, { limit: 10, filters });
    const rows = res?.data || res || [];
    related.value[section.id] = { loading: false, rows: Array.isArray(rows) ? rows : [] };
  } catch {
    related.value[section.id] = { loading: false, rows: [] };
  }
}

async function refreshRelated() {
  for (const s of sections.value) {
    if (s.type === 'related-list') {
      await loadRelated(s);
    }
  }
}

async function loadPathSteps(field: string) {
  if (!entityId.value || !field) {
    pathSteps.value = [];
    return;
  }
  try {
    const res = await listEntityRecords(entityId.value, { limit: 100 });
    const rows = res?.data || res || [];
    const seen: string[] = [];
    for (const r of Array.isArray(rows) ? rows : []) {
      const v = String(r?.data?.[field] ?? '');
      if (v && !seen.includes(v)) seen.push(v);
    }
    pathSteps.value = seen;
  } catch {
    pathSteps.value = [];
  }
}

function addSection(type: Section['type']) {
  if (type === 'highlights') sections.value.push({ id: uid(), type, fields: [] });
  else if (type === 'details') sections.value.push({ id: uid(), type, fields: [] });
  else if (type === 'path') sections.value.push({ id: uid(), type, field: '' });
  else sections.value.push({ id: uid(), type, title: 'Related', targetEntity: null, filterField: '' });
  persist();
}

function move(i: number, dir: number) {
  const j = i + dir;
  if (j < 0 || j >= sections.value.length) return;
  const [s] = sections.value.splice(i, 1);
  sections.value.splice(j, 0, s);
  persist();
}

function exportJson() {
  const blob = new Blob([JSON.stringify({ entityId: entityId.value, sections: sections.value }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `record-page-${entityId.value}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJson(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (Array.isArray(parsed.sections)) {
        sections.value = parsed.sections;
        persist();
        message.success('Page imported');
      }
    } catch {
      message.error('Invalid JSON file');
    }
  };
  reader.readAsText(file);
}

watch(entityId, () => { loadSaved(); loadRecordOptions(); });
watch(recordId, async () => {
  await loadPreview();
  await refreshRelated();
  const pathSection = sections.value.find((s) => s.type === 'path');
  if (pathSection && pathSection.type === 'path') {
    await loadPathSteps(pathSection.field);
  }
});
watch(sections, persist, { deep: true });

loadGraph().then(() => { loadSaved(); loadRecordOptions(); });
</script>

<template>
  <div class="rpb-page p-6">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <LayoutTemplate :size="24" />
          Record Page Builder
        </h1>
        <p class="text-gray-500 m-0">Compose highlights, path, details, and related lists per entity</p>
      </div>
      <div class="flex items-center gap-2">
        <a-select v-model:value="entityId" placeholder="Select entity" style="width: 220px">
          <a-select-option v-for="e in entities" :key="e.id" :value="e.id">{{ e.label }}</a-select-option>
        </a-select>
        <a-button @click="exportJson"><template #icon><Download :size="14" /></template>Export</a-button>
        <a-button>
          <template #icon><Upload :size="14" /></template>Import
          <input type="file" accept="application/json" class="rpb-file" @change="importJson" />
        </a-button>
      </div>
    </div>

    <a-spin :spinning="loading">
      <div class="rpb-grid">
        <div class="rpb-config">
          <div class="rpb-title">Sections</div>
          <div v-for="(s, i) in sections" :key="s.id" class="rpb-section">
            <div class="rpb-section-head">
              <span class="rpb-section-type">{{ s.type }}</span>
              <a-button type="text" size="small" @click="move(i, -1)"><template #icon><ArrowUp :size="12" /></template></a-button>
              <a-button type="text" size="small" @click="move(i, 1)"><template #icon><ArrowDown :size="12" /></template></a-button>
              <a-button type="text" size="small" danger @click="sections.splice(i, 1)"><template #icon><Trash2 :size="12" /></template></a-button>
            </div>
            <template v-if="s.type === 'highlights' || s.type === 'details'">
              <a-select v-model:value="s.fields" mode="multiple" placeholder="Select fields" style="width: 100%" size="small">
                <a-select-option v-for="f in entity?.fields || []" :key="f.name" :value="f.name">{{ f.label }}</a-select-option>
              </a-select>
            </template>
            <template v-else-if="s.type === 'path'">
              <a-select v-model:value="s.field" placeholder="Stage field" style="width: 100%" size="small">
                <a-select-option v-for="f in entity?.fields || []" :key="f.name" :value="f.name">{{ f.label }}</a-select-option>
              </a-select>
            </template>
            <template v-else>
              <a-input v-model:value="s.title" size="small" placeholder="Title" class="mb-1" />
              <a-select v-model:value="s.targetEntity" placeholder="Target entity" style="width: 100%" size="small" class="mb-1">
                <a-select-option v-for="e in entities" :key="e.id" :value="e.id">{{ e.label }}</a-select-option>
              </a-select>
              <a-input v-model:value="s.filterField" size="small" placeholder="Filter field on target (e.g. order_ref)" />
            </template>
          </div>
          <a-dropdown>
            <a-button type="dashed" block><template #icon><Plus :size="14" /></template>Add section</a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item key="highlights" @click="addSection('highlights')">Highlights Panel</a-menu-item>
                <a-menu-item key="path" @click="addSection('path')">Path</a-menu-item>
                <a-menu-item key="details" @click="addSection('details')">Details</a-menu-item>
                <a-menu-item key="related-list" @click="addSection('related-list')">Related List</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>

        <div class="rpb-preview">
          <div class="rpb-title">Preview</div>
          <a-select v-model:value="recordId" placeholder="Select a record to preview" style="width: 280px" class="mb-3">
            <a-select-option v-for="r in recordOptions" :key="r.id" :value="r.id">{{ r.label }}</a-select-option>
          </a-select>
          <div v-if="!recordId" class="rpb-hint">Select a record to render the page</div>
          <div v-for="s in sections" :key="s.id" class="rpb-block">
            <template v-if="s.type === 'highlights'">
              <div class="rpb-highlights">
                <div v-for="f in s.fields" :key="f" class="rpb-hl">
                  <div class="rpb-hl-label">{{ fieldLabel(f) }}</div>
                  <div class="rpb-hl-value">{{ formatValue(recordData[f]) }}</div>
                </div>
              </div>
            </template>
            <template v-else-if="s.type === 'path'">
              <div class="rpb-path">
                <div
                  v-for="step in pathSteps"
                  :key="step"
                  class="rpb-step"
                  :class="{ active: String(recordData[s.field] || '') === step, done: pathSteps.indexOf(String(recordData[s.field] || '')) > pathSteps.indexOf(step) }"
                >
                  {{ step }}
                </div>
              </div>
            </template>
            <template v-else-if="s.type === 'details'">
              <a-descriptions bordered size="small" :column="2">
                <a-descriptions-item v-for="f in s.fields" :key="f" :label="fieldLabel(f)">
                  {{ formatValue(recordData[f]) }}
                </a-descriptions-item>
              </a-descriptions>
            </template>
            <template v-else>
              <a-card size="small" :title="s.title || 'Related'">
                <div v-if="!s.targetEntity || !s.filterField" class="rpb-hint">Configure target entity + filter field</div>
                <a-spin v-else :spinning="!!related[s.id]?.loading">
                  <div v-if="!related[s.id]?.rows?.length" class="rpb-hint">No related records</div>
                  <div v-for="row in related[s.id]?.rows || []" :key="row.id" class="rpb-related">
                    #{{ row.id }} {{ String(row.data?.name || row.data?.title || '') }}
                  </div>
                </a-spin>
              </a-card>
            </template>
          </div>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<style scoped>
.rpb-grid { display: grid; grid-template-columns: 300px 1fr; gap: 16px; }
.rpb-title { font-size: 12px; font-weight: 600; color: #666; margin-bottom: 8px; text-transform: uppercase; }
.rpb-section { border: 1px solid #eee; border-radius: 8px; padding: 10px; margin-bottom: 10px; background: #fff; }
.rpb-section-head { display: flex; align-items: center; gap: 2px; margin-bottom: 8px; }
.rpb-section-type { font-weight: 600; font-size: 12px; text-transform: capitalize; margin-right: auto; }
.rpb-hint { color: #bbb; font-size: 12px; padding: 12px 0; }
.rpb-block { margin-bottom: 16px; }
.rpb-highlights { display: flex; gap: 24px; background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 12px 16px; }
.rpb-hl-label { font-size: 11px; color: #999; text-transform: uppercase; }
.rpb-hl-value { font-size: 18px; font-weight: 600; }
.rpb-path { display: flex; gap: 4px; }
.rpb-step { flex: 1; text-align: center; font-size: 12px; padding: 8px 4px; background: #f5f5f5; border-radius: 6px; color: #999; }
.rpb-step.done { background: #e6f4ff; color: #1677ff; }
.rpb-step.active { background: #1677ff; color: #fff; font-weight: 600; }
.rpb-related { font-size: 12px; padding: 4px 0; border-bottom: 1px solid #f5f5f5; }
.rpb-file { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
</style>
