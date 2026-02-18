<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Plus, Trash2, Target } from 'lucide-vue-next';
import { get } from '@/api/request';

interface Condition {
  section: 'include' | 'exclude';
  type: string;
  operator: 'is' | 'is-not';
  value: any;
}

const props = defineProps<{
  modelValue: string; // JSON string of Condition[]
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

// Internal conditions array
const conditions = ref<Condition[]>([]);

// Page autocomplete
const pageOptions = ref<{ label: string; value: string }[]>([]);
const pageSearchLoading = ref(false);

function parseFromModel() {
  try {
    const parsed = JSON.parse(props.modelValue || '[]');
    if (Array.isArray(parsed)) {
      conditions.value = parsed;
      return;
    }
  } catch { /* ignore */ }
  conditions.value = [];
}

watch(() => props.modelValue, parseFromModel, { immediate: true });

function emitUpdate() {
  emit('update:modelValue', JSON.stringify(conditions.value));
}

function addCondition(section: 'include' | 'exclude') {
  conditions.value.push({ section, type: 'all', operator: 'is', value: null });
  emitUpdate();
}

function removeCondition(index: number) {
  conditions.value.splice(index, 1);
  emitUpdate();
}

function updateCondition(index: number, updates: Partial<Condition>) {
  Object.assign(conditions.value[index], updates);
  // Reset value when type changes
  if ('type' in updates) {
    conditions.value[index].value = null;
  }
  emitUpdate();
}

const includeConditions = computed(() =>
  conditions.value.map((c, i) => ({ ...c, _idx: i })).filter(c => c.section === 'include')
);
const excludeConditions = computed(() =>
  conditions.value.map((c, i) => ({ ...c, _idx: i })).filter(c => c.section === 'exclude')
);

const conditionTypeOptions = [
  { value: 'all', label: 'Everywhere (All Pages)' },
  { value: 'page-type', label: 'Page Type' },
  { value: 'specific-page', label: 'Specific Page' },
  { value: 'taxonomy', label: 'Taxonomy' },
  { value: 'author', label: 'Author' },
  { value: 'date-range', label: 'Date Range' },
];

const pageTypeOptions = [
  { value: 'page', label: 'Page' },
  { value: 'post', label: 'Post' },
  { value: 'archive', label: 'Archive' },
  { value: '404', label: '404 Error' },
  { value: 'search', label: 'Search' },
  { value: 'front', label: 'Front Page' },
];

async function searchPages(query: string) {
  pageSearchLoading.value = true;
  try {
    const result = await get('/website/pages', { params: { search: query, limit: 20 } });
    const rows = result?.rows || result?.data || (Array.isArray(result) ? result : []);
    pageOptions.value = rows.map((p: any) => ({
      label: `${p.title} (/${p.slug})`,
      value: p.slug,
    }));
  } catch {
    pageOptions.value = [];
  } finally {
    pageSearchLoading.value = false;
  }
}

function onDateRangeChange(idx: number, field: 'from' | 'to', value: string) {
  const cond = conditions.value[idx];
  const cur = typeof cond.value === 'object' && cond.value ? cond.value : {};
  conditions.value[idx].value = { ...cur, [field]: value };
  emitUpdate();
}
</script>

<template>
  <div class="condition-builder">
    <div class="cb-header">
      <Target :size="16" class="text-indigo-500" />
      <span class="cb-title">Display Conditions</span>
      <span class="cb-hint">Control when this template is shown</span>
    </div>

    <!-- Include Conditions -->
    <div class="cb-section">
      <div class="cb-section-header">
        <span class="cb-section-label cb-section-label--include">Include When</span>
        <span class="cb-section-desc">Template shows when ANY condition matches</span>
      </div>

      <div v-for="cond in includeConditions" :key="cond._idx" class="cb-row">
        <!-- Type select -->
        <a-select
          :value="cond.type"
          size="small"
          style="width: 160px; flex-shrink: 0;"
          @change="(v: string) => updateCondition(cond._idx, { type: v })"
        >
          <a-select-option v-for="opt in conditionTypeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </a-select-option>
        </a-select>

        <!-- Operator (is / is-not) — hidden for 'all' and 'date-range' -->
        <a-select
          v-if="cond.type !== 'all' && cond.type !== 'date-range'"
          :value="cond.operator"
          size="small"
          style="width: 90px; flex-shrink: 0;"
          @change="(v: string) => updateCondition(cond._idx, { operator: v as 'is' | 'is-not' })"
        >
          <a-select-option value="is">is</a-select-option>
          <a-select-option value="is-not">is not</a-select-option>
        </a-select>

        <!-- Value — depends on type -->
        <template v-if="cond.type === 'all'">
          <span class="cb-all-label">Applies everywhere</span>
        </template>

        <template v-else-if="cond.type === 'page-type'">
          <a-select
            :value="cond.value"
            size="small"
            placeholder="Select page type"
            style="flex: 1;"
            @change="(v: string) => { conditions[cond._idx].value = v; emitUpdate(); }"
          >
            <a-select-option v-for="opt in pageTypeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-select-option>
          </a-select>
        </template>

        <template v-else-if="cond.type === 'specific-page'">
          <a-select
            :value="cond.value"
            size="small"
            show-search
            placeholder="Search pages..."
            :loading="pageSearchLoading"
            :options="pageOptions"
            style="flex: 1;"
            :filter-option="false"
            @search="searchPages"
            @change="(v: string) => { conditions[cond._idx].value = v; emitUpdate(); }"
          />
        </template>

        <template v-else-if="cond.type === 'taxonomy'">
          <a-input
            :value="cond.value || ''"
            size="small"
            placeholder="Taxonomy slug (e.g. category/tech)"
            style="flex: 1;"
            @change="(e: any) => { conditions[cond._idx].value = e.target.value; emitUpdate(); }"
          />
        </template>

        <template v-else-if="cond.type === 'author'">
          <a-input
            :value="cond.value || ''"
            size="small"
            placeholder="Author ID or username"
            style="flex: 1;"
            @change="(e: any) => { conditions[cond._idx].value = e.target.value; emitUpdate(); }"
          />
        </template>

        <template v-else-if="cond.type === 'date-range'">
          <div class="cb-date-range">
            <a-date-picker
              size="small"
              placeholder="From"
              style="width: 130px;"
              :value="cond.value?.from || null"
              @change="(_: any, ds: string) => onDateRangeChange(cond._idx, 'from', ds)"
            />
            <span class="cb-date-sep">to</span>
            <a-date-picker
              size="small"
              placeholder="To"
              style="width: 130px;"
              :value="cond.value?.to || null"
              @change="(_: any, ds: string) => onDateRangeChange(cond._idx, 'to', ds)"
            />
          </div>
        </template>

        <!-- Remove button -->
        <a-button
          type="text"
          size="small"
          danger
          class="cb-remove"
          @click="removeCondition(cond._idx)"
        >
          <template #icon><Trash2 :size="13" /></template>
        </a-button>
      </div>

      <a-button size="small" type="dashed" class="cb-add-btn" @click="addCondition('include')">
        <template #icon><Plus :size="13" /></template>
        Add Include Condition
      </a-button>
    </div>

    <!-- Exclude Conditions -->
    <div class="cb-section cb-section--exclude">
      <div class="cb-section-header">
        <span class="cb-section-label cb-section-label--exclude">Exclude When</span>
        <span class="cb-section-desc">Template hides when ANY condition matches</span>
      </div>

      <div v-for="cond in excludeConditions" :key="cond._idx" class="cb-row">
        <a-select
          :value="cond.type"
          size="small"
          style="width: 160px; flex-shrink: 0;"
          @change="(v: string) => updateCondition(cond._idx, { type: v })"
        >
          <a-select-option v-for="opt in conditionTypeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </a-select-option>
        </a-select>

        <a-select
          v-if="cond.type !== 'all' && cond.type !== 'date-range'"
          :value="cond.operator"
          size="small"
          style="width: 90px; flex-shrink: 0;"
          @change="(v: string) => updateCondition(cond._idx, { operator: v as 'is' | 'is-not' })"
        >
          <a-select-option value="is">is</a-select-option>
          <a-select-option value="is-not">is not</a-select-option>
        </a-select>

        <template v-if="cond.type === 'all'">
          <span class="cb-all-label">Applies everywhere</span>
        </template>
        <template v-else-if="cond.type === 'page-type'">
          <a-select
            :value="cond.value"
            size="small"
            placeholder="Select page type"
            style="flex: 1;"
            @change="(v: string) => { conditions[cond._idx].value = v; emitUpdate(); }"
          >
            <a-select-option v-for="opt in pageTypeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-select-option>
          </a-select>
        </template>
        <template v-else-if="cond.type === 'specific-page'">
          <a-select
            :value="cond.value"
            size="small"
            show-search
            placeholder="Search pages..."
            :loading="pageSearchLoading"
            :options="pageOptions"
            style="flex: 1;"
            :filter-option="false"
            @search="searchPages"
            @change="(v: string) => { conditions[cond._idx].value = v; emitUpdate(); }"
          />
        </template>
        <template v-else-if="cond.type === 'taxonomy'">
          <a-input
            :value="cond.value || ''"
            size="small"
            placeholder="Taxonomy slug"
            style="flex: 1;"
            @change="(e: any) => { conditions[cond._idx].value = e.target.value; emitUpdate(); }"
          />
        </template>
        <template v-else-if="cond.type === 'author'">
          <a-input
            :value="cond.value || ''"
            size="small"
            placeholder="Author ID or username"
            style="flex: 1;"
            @change="(e: any) => { conditions[cond._idx].value = e.target.value; emitUpdate(); }"
          />
        </template>
        <template v-else-if="cond.type === 'date-range'">
          <div class="cb-date-range">
            <a-date-picker
              size="small"
              placeholder="From"
              style="width: 130px;"
              :value="cond.value?.from || null"
              @change="(_: any, ds: string) => onDateRangeChange(cond._idx, 'from', ds)"
            />
            <span class="cb-date-sep">to</span>
            <a-date-picker
              size="small"
              placeholder="To"
              style="width: 130px;"
              :value="cond.value?.to || null"
              @change="(_: any, ds: string) => onDateRangeChange(cond._idx, 'to', ds)"
            />
          </div>
        </template>

        <a-button
          type="text"
          size="small"
          danger
          class="cb-remove"
          @click="removeCondition(cond._idx)"
        >
          <template #icon><Trash2 :size="13" /></template>
        </a-button>
      </div>

      <a-button size="small" type="dashed" class="cb-add-btn cb-add-btn--exclude" @click="addCondition('exclude')">
        <template #icon><Plus :size="13" /></template>
        Add Exclude Condition
      </a-button>
    </div>
  </div>
</template>

<style scoped>
.condition-builder {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}
.cb-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f8f9ff;
  border-bottom: 1px solid #e5e7eb;
}
.cb-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.cb-hint {
  font-size: 12px;
  color: #9ca3af;
  margin-left: auto;
}
.cb-section {
  padding: 12px 14px;
  border-bottom: 1px solid #f3f4f6;
}
.cb-section:last-child {
  border-bottom: none;
}
.cb-section--exclude {
  background: #fff9f9;
}
.cb-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.cb-section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 8px;
  border-radius: 4px;
}
.cb-section-label--include {
  background: #dcfce7;
  color: #15803d;
}
.cb-section-label--exclude {
  background: #fee2e2;
  color: #b91c1c;
}
.cb-section-desc {
  font-size: 11px;
  color: #9ca3af;
}
.cb-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.cb-all-label {
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
  flex: 1;
}
.cb-date-range {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}
.cb-date-sep {
  font-size: 12px;
  color: #9ca3af;
}
.cb-remove {
  flex-shrink: 0;
}
.cb-add-btn {
  margin-top: 4px;
  width: 100%;
  color: #059669;
  border-color: #6ee7b7;
}
.cb-add-btn:hover {
  color: #065f46;
  border-color: #059669;
}
.cb-add-btn--exclude {
  color: #dc2626;
  border-color: #fca5a5;
}
.cb-add-btn--exclude:hover {
  color: #991b1b;
  border-color: #dc2626;
}
</style>
