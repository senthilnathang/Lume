<script lang="ts" setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { message } from 'ant-design-vue';
import { Network, Search, RefreshCw, ZoomIn, ZoomOut } from 'lucide-vue-next';
import { getSchemaGraph, createEntityField } from '@modules/base_customization/static/api/index';

defineOptions({ name: 'SchemaErdView' });

interface ErdField {
  id: number;
  name: string;
  label: string;
  type: string;
  required: boolean;
}

interface ErdEntity {
  id: number;
  name: string;
  label: string;
  fields: ErdField[];
}

interface ErdLink {
  fromEntity: number;
  fromField: string;
  toEntity: number;
  toField: string;
  type: string;
}

const loading = ref(false);
const entities = ref<ErdEntity[]>([]);
const links = ref<ErdLink[]>([]);
const searchQuery = ref('');
const zoom = ref(1);
const selectedId = ref<number | null>(null);
const relateModal = ref(false);
const relateSaving = ref(false);
const relateSource = ref<ErdEntity | null>(null);
const relateTarget = ref<ErdEntity | null>(null);
const relateType = ref<'lookup' | 'master-detail'>('lookup');
const relateFieldName = ref('');
const canvasRef = ref<HTMLElement | null>(null);
const nodeRefs = ref<Record<number, HTMLElement | null>>({});
const edgePaths = ref<{ d: string; key: string }[]>([]);

const filteredEntities = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return entities.value;
  return entities.value.filter(
    (e) =>
      e.label.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q) ||
      e.fields.some((f) => f.name.toLowerCase().includes(q)),
  );
});

const columns = computed(() => {
  const ids = new Set(filteredEntities.value.map((e) => e.id));
  const depth = new Map<number, number>();
  const visit = (id: number, seen: Set<number>): number => {
    if (depth.has(id)) return depth.get(id) as number;
    if (seen.has(id)) return 0;
    seen.add(id);
    let d = 0;
    for (const l of links.value) {
      if (l.fromEntity === id && ids.has(l.toEntity)) {
        d = Math.max(d, visit(l.toEntity, seen) + 1);
      }
    }
    seen.delete(id);
    depth.set(id, d);
    return d;
  };
  for (const e of filteredEntities.value) visit(e.id, new Set());
  const maxDepth = Math.max(0, ...depth.values());
  const cols: ErdEntity[][] = Array.from({ length: maxDepth + 1 }, () => []);
  for (const e of filteredEntities.value) cols[depth.get(e.id) || 0].push(e);
  return cols;
});

const selectedLinks = computed(() =>
  selectedId.value === null
    ? links.value
    : links.value.filter((l) => l.fromEntity === selectedId.value || l.toEntity === selectedId.value),
);

function linkLabel(l: ErdLink): string {
  const from = entities.value.find((e) => e.id === l.fromEntity);
  const to = entities.value.find((e) => e.id === l.toEntity);
  return `${from?.label || l.fromEntity}.${l.fromField} → ${to?.label || l.toEntity}`;
}

function drawEdges() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const box = canvas.getBoundingClientRect();
  const paths: { d: string; key: string }[] = [];
  for (const l of selectedLinks.value) {
    const a = nodeRefs.value[l.fromEntity];
    const b = nodeRefs.value[l.toEntity];
    if (!a || !b) continue;
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    const x1 = (ra.right - box.left) / zoom.value;
    const y1 = (ra.top + ra.height / 2 - box.top) / zoom.value;
    const x2 = (rb.left - box.left) / zoom.value;
    const y2 = (rb.top + rb.height / 2 - box.top) / zoom.value;
    const mx = (x1 + x2) / 2;
    paths.push({ d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`, key: `${l.fromEntity}:${l.fromField}:${l.toEntity}` });
  }
  edgePaths.value = paths;
}

async function loadData() {
  loading.value = true;
  try {
    const res = await getSchemaGraph();
    const data = res?.data || res;
    entities.value = data?.entities || [];
    links.value = data?.links || [];
    await nextTick();
    drawEdges();
  } catch (error) {
    message.error('Failed to load schema graph');
  } finally {
    loading.value = false;
  }
}

function select(id: number) {
  selectedId.value = selectedId.value === id ? null : id;
  nextTick(drawEdges);
}

function setZoom(delta: number) {
  zoom.value = Math.min(1.5, Math.max(0.5, zoom.value + delta));
  nextTick(drawEdges);
}

function onDragStart(event: DragEvent, entity: ErdEntity) {
  if (!event.dataTransfer) return;
  event.dataTransfer.setData('text/plain', String(entity.id));
  event.dataTransfer.effectAllowed = 'link';
}

function onDrop(event: DragEvent, target: ErdEntity) {
  event.preventDefault();
  const raw = event.dataTransfer?.getData('text/plain');
  const sourceId = Number(raw);
  if (!Number.isInteger(sourceId) || sourceId === target.id) return;
  const source = entities.value.find((e) => e.id === sourceId);
  if (!source) return;
  relateSource.value = source;
  relateTarget.value = target;
  relateType.value = 'lookup';
  relateFieldName.value = `${target.name}_ref`;
  relateModal.value = true;
}

async function saveRelation() {
  if (!relateSource.value || !relateTarget.value || !relateFieldName.value.trim()) {
    message.warning('Field name is required');
    return;
  }
  relateSaving.value = true;
  try {
    await createEntityField(relateSource.value.id, {
      name: relateFieldName.value.trim(),
      label: relateFieldName.value.trim(),
      type: relateType.value,
      lookupEntityId: relateTarget.value.id,
      lookupField: 'id',
    });
    message.success(`Created ${relateType.value} on ${relateSource.value.label}`);
    relateModal.value = false;
    await loadData();
  } catch (error: unknown) {
    const err = error as { response?: { data?: { errors?: Record<string, string>; message?: string } }; message?: string };
    const details = err.response?.data?.errors ? Object.values(err.response.data.errors).join(', ') : '';
    message.error(details || err.response?.data?.message || err.message || 'Failed to create relation');
  } finally {
    relateSaving.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <div class="erd-page p-6">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <Network :size="24" />
          Schema ERD
        </h1>
        <p class="text-gray-500 m-0">{{ entities.length }} entities · {{ links.length }} lookup links</p>
      </div>
      <div class="flex items-center gap-2">
        <a-input v-model:value="searchQuery" placeholder="Search entities or fields..." allow-clear style="width: 240px">
          <template #prefix><Search :size="14" class="text-gray-400" /></template>
        </a-input>
        <a-button @click="setZoom(0.1)"><template #icon><ZoomIn :size="14" /></template></a-button>
        <a-button @click="setZoom(-0.1)"><template #icon><ZoomOut :size="14" /></template></a-button>
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
      </div>
    </div>

    <a-spin :spinning="loading">
      <div v-if="!entities.length && !loading" class="text-center py-16">
        <a-empty description="No entities yet — create one in the entity builder" />
      </div>
      <div v-else ref="canvasRef" class="erd-canvas">
        <svg class="erd-edges" :key="edgePaths.length">
          <path v-for="e in edgePaths" :key="e.key" :d="e.d" fill="none" stroke="#1677ff" stroke-width="1.5" opacity="0.6" />
        </svg>
        <div class="erd-columns" :style="{ transform: `scale(${zoom})`, transformOrigin: 'top left' }">
          <div v-for="(col, ci) in columns" :key="ci" class="erd-column">
            <div
              v-for="entity in col"
              :key="entity.id"
              :ref="(el) => { nodeRefs[entity.id] = el as HTMLElement | null; }"
              class="erd-node"
              :class="{ selected: selectedId === entity.id, dimmed: selectedId !== null && selectedId !== entity.id && !selectedLinks.some((l) => l.fromEntity === entity.id || l.toEntity === entity.id) }"
              @click="select(entity.id)"
              @dragover.prevent
              @drop="(e: DragEvent) => onDrop(e, entity)"
            >
              <div class="erd-node-title" draggable="true" @dragstart="(e: DragEvent) => onDragStart(e, entity)" title="Drag onto another entity to relate">
                <span class="erd-grip">⠿</span> {{ entity.label }}
              </div>
              <div class="erd-node-name">{{ entity.name }}</div>
              <div class="erd-node-fields">
                <div v-for="f in entity.fields.slice(0, 8)" :key="f.id" class="erd-field">
                  <span>{{ f.label }}</span>
                  <span class="erd-field-type">{{ f.type }}</span>
                </div>
                <div v-if="entity.fields.length > 8" class="erd-more">+{{ entity.fields.length - 8 }} more</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <a-modal
        v-model:open="relateModal"
        title="Create relation"
        ok-text="Create"
        :confirm-loading="relateSaving"
        @ok="saveRelation"
      >
        <p class="text-sm text-gray-500">
          Add a field on <strong>{{ relateSource?.label }}</strong> referencing <strong>{{ relateTarget?.label }}</strong>.
          Master-detail children are deleted with their master.
        </p>
        <a-form layout="vertical">
          <a-form-item label="Relation type">
            <a-select v-model:value="relateType">
              <a-select-option value="lookup">Lookup</a-select-option>
              <a-select-option value="master-detail">Master-detail</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="Field name" required>
            <a-input v-model:value="relateFieldName" placeholder="e.g. order_ref" />
          </a-form-item>
        </a-form>
      </a-modal>

      <div v-if="selectedId !== null" class="mt-4">
        <a-card size="small" title="Links for selected entity">
          <div v-if="!selectedLinks.length" class="text-gray-400 text-sm">No lookup links</div>
          <ul v-else class="m-0 pl-4 text-sm">
            <li v-for="l in selectedLinks" :key="`${l.fromEntity}:${l.fromField}:${l.toEntity}`">{{ linkLabel(l) }}</li>
          </ul>
        </a-card>
      </div>
    </a-spin>
  </div>
</template>

<style scoped>
.erd-page { min-height: 100%; }
.erd-canvas { position: relative; overflow: auto; background: #fafafa; border: 1px solid #eee; border-radius: 8px; min-height: 420px; max-height: 70vh; }
.erd-edges { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.erd-columns { position: relative; display: flex; gap: 120px; padding: 24px; width: max-content; }
.erd-column { display: flex; flex-direction: column; gap: 16px; }
.erd-node { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; width: 220px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
.erd-node:hover { border-color: #91caff; }
.erd-node.selected { border-color: #1677ff; box-shadow: 0 0 0 2px rgba(22,119,255,0.2); }
.erd-node.dimmed { opacity: 0.45; }
.erd-node-title { font-weight: 600; padding: 8px 12px; border-bottom: 1px solid #f0f0f0; cursor: grab; }
.erd-node-title:active { cursor: grabbing; }
.erd-grip { color: #bbb; margin-right: 4px; }
.erd-node-name { font-size: 11px; color: #999; padding: 2px 12px 6px; }
.erd-node-fields { padding: 0 12px 10px; font-size: 12px; }
.erd-field { display: flex; justify-content: space-between; padding: 2px 0; }
.erd-field-type { color: #999; }
.erd-more { color: #bbb; font-size: 11px; }
</style>
