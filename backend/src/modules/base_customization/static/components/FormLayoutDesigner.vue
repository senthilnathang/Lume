<template>
  <div class="fld">
    <div class="fld-palette">
      <div class="fld-pane-title">Fields</div>
      <draggable :list="palette" :group="{ name: 'fld', pull: 'clone', put: false }" :clone="cloneField" item-key="type" class="fld-palette-list">
        <template #item="{ element }">
          <div class="fld-palette-item">{{ element.label }}</div>
        </template>
      </draggable>
      <a-button size="small" block @click="addSection" class="mt-2">+ Section</a-button>
    </div>
    <div class="fld-canvas" :class="{ phone: (formFactor || 'desktop') === 'phone' }">
      <div v-if="!sections.length" class="fld-empty">Drag fields here or add a section</div>
      <div v-for="(section, sIdx) in sections" :key="sIdx" class="fld-section">
        <div class="fld-section-head">
          <a-input v-model:value="section.title" size="small" placeholder="Section title" style="width: 180px" />
          <a-select v-model:value="section.columns" size="small" style="width: 110px">
            <a-select-option :value="1">1 col</a-select-option>
            <a-select-option :value="2">2 col</a-select-option>
            <a-select-option :value="3">3 col</a-select-option>
            <a-select-option :value="4">4 col</a-select-option>
          </a-select>
          <a-button type="text" size="small" danger @click="removeSection(sIdx)"><template #icon><Trash2 :size="14" /></template></a-button>
        </div>
        <draggable :list="section.fields" group="fld" item-key="uid" class="fld-fields" :style="{ gridTemplateColumns: `repeat(${section.columns || 1}, 1fr)` }">
          <template #item="{ element, index }">
            <div class="fld-field" :class="{ selected: selected?.uid === element.uid, dimmed: isHiddenForPreview(element) }" @click="selected = element" :title="isHiddenForPreview(element) ? 'Hidden for preview profile' : ''">
              <span class="fld-field-name">{{ element.label || element.name }}</span>
              <span class="fld-field-type">{{ element.type }}</span>
              <span v-if="element.required" class="fld-req">*</span>
              <span v-if="element.validation.length" class="fld-val" :title="element.validation.map((r) => r.type).join(', ')">✓{{ element.validation.length }}</span>
              <a-button type="text" size="small" @click.stop="removeField(sIdx, index)">×</a-button>
            </div>
          </template>
        </draggable>
      </div>
    </div>
    <div class="fld-inspector">
      <div class="fld-pane-title">Inspector</div>
      <div v-if="!selected" class="fld-hint">Select a field to edit</div>
      <a-form v-else layout="vertical" size="small">
        <a-form-item label="Label"><a-input v-model:value="selected.label" size="small" /></a-form-item>
        <a-form-item label="Name"><a-input v-model:value="selected.name" size="small" /></a-form-item>
        <a-form-item label="Required"><a-switch v-model:checked="selected.required" size="small" /></a-form-item>
        <a-form-item label="Show when field"><a-input v-model:value="selected.visibleIf.field" size="small" placeholder="e.g. status" /></a-form-item>
        <a-form-item label="Operator">
          <a-select v-model:value="selected.visibleIf.op" size="small">
            <a-select-option value="eq">equals</a-select-option>
            <a-select-option value="neq">not equals</a-select-option>
            <a-select-option value="contains">contains</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Value"><a-input v-model:value="selected.visibleIf.value" size="small" /></a-form-item>
        <a-form-item label="Profiles (comma-separated, empty = all)"><a-input :value="selected.profiles.join(', ')" size="small" placeholder="e.g. admin, manager" @change="(e: Event) => { selected.profiles = ((e.target as HTMLInputElement).value || '').split(',').map((s) => s.trim()).filter(Boolean); }" /></a-form-item>
        <a-form-item label="Validation rules">
          <div v-if="!selected.validation.length" class="fld-hint">None — add regex, range, length, or unique</div>
          <div v-for="(rule, i) in selected.validation" :key="i" class="fld-rule">
            <a-select v-model:value="rule.type" size="small" style="width: 110px">
              <a-select-option value="regex">regex</a-select-option>
              <a-select-option value="minLength">min length</a-select-option>
              <a-select-option value="maxLength">max length</a-select-option>
              <a-select-option value="min">min value</a-select-option>
              <a-select-option value="max">max value</a-select-option>
              <a-select-option value="unique">unique</a-select-option>
            </a-select>
            <a-input v-if="rule.type === 'regex'" v-model:value="rule.pattern" size="small" placeholder="pattern" />
            <a-input v-else-if="rule.type !== 'unique'" v-model:value="rule.value" size="small" placeholder="value" />
            <a-input v-model:value="rule.message" size="small" placeholder="message (optional)" />
            <a-button type="text" size="small" danger @click="selected.validation.splice(i, 1)">×</a-button>
          </div>
          <a-button size="small" type="dashed" block @click="selected.validation.push({ type: 'regex', pattern: '', message: '' })">+ Rule</a-button>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import draggable from 'vuedraggable';
import { Trash2 } from 'lucide-vue-next';
import { getBlocksFor } from './block-manifest.js';
type VisibleIf = { field: string; op: string; value: string };
type ValidationRule = { type: string; value?: string; pattern?: string; message?: string };
type DesignerField = { uid: string; name: string; label: string; type: string; required: boolean; visibleIf: VisibleIf; profiles: string[]; validation: ValidationRule[] };
type DesignerSection = { title: string; columns: number; fields: DesignerField[] };
const props = defineProps<{ modelValue?: { sections?: DesignerSection[] }; target?: string; formFactor?: string; previewProfile?: string }>();
const emit = defineEmits(['update:modelValue']);
const uid = () => `f_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6)}`;
const palette = computed(() => getBlocksFor(props.target || 'form', props.formFactor || 'desktop'));
function isHiddenForPreview(f: DesignerField): boolean {
  const p = (props.previewProfile || '').trim();
  if (!p) return false;
  return Array.isArray(f.profiles) && f.profiles.length > 0 && !f.profiles.includes(p);
}
const sections = ref<DesignerSection[]>([]);
const selected = ref<DesignerField | null>(null);
function normalize(input: { sections?: DesignerSection[] }): DesignerSection[] {
  const list = Array.isArray(input?.sections) ? input.sections : [];
  return list.map((s) => ({
    title: s.title || 'General',
    columns: Math.min(4, Math.max(1, Number(s.columns) || 1)),
    fields: (Array.isArray(s.fields) ? s.fields : []).map((f) => {
      const obj = typeof f === 'string' ? { name: f, label: f, type: 'text' } : f;
      return {
        uid: obj.uid || uid(), name: obj.name || 'field', label: obj.label || obj.name || 'Field',
        type: obj.type || 'text', required: !!obj.required,
        visibleIf: { field: obj.visibleIf?.field || '', op: obj.visibleIf?.op || 'eq', value: obj.visibleIf?.value || '' },
        profiles: Array.isArray(obj.profiles) ? obj.profiles : (typeof obj.profiles === 'string' && obj.profiles ? String(obj.profiles).split(',').map((s) => s.trim()).filter(Boolean) : []),
        validation: Array.isArray(obj.validation) ? obj.validation.filter((r) => r && typeof r.type === 'string').map((r) => ({ type: r.type, ...(r.value !== undefined ? { value: String(r.value) } : {}), ...(r.pattern ? { pattern: r.pattern } : {}), ...(r.message ? { message: r.message } : {}) })) : [],
      };
    }),
  }));
}
watch(() => props.modelValue, (v) => { sections.value = normalize(v || {}); }, { immediate: true, deep: true });
watch(sections, (v) => {
  emit('update:modelValue', { sections: v.map((s) => ({ title: s.title, columns: s.columns, fields: s.fields.map((f) => ({ name: f.name, label: f.label, type: f.type, required: f.required, ...(f.visibleIf.field ? { visibleIf: { ...f.visibleIf } } : {}), ...(f.profiles.length ? { profiles: [...f.profiles] } : {}), ...(f.validation.length ? { validation: f.validation.map((r) => ({ ...r })) } : {}) })) })) });
}, { deep: true });
function cloneField(item: { type: string; label: string }): DesignerField {
  const base = item.type;
  return { uid: uid(), name: `${base}_${Math.floor(Math.random() * 1000)}`, label: item.label, type: base, required: false, visibleIf: { field: '', op: 'eq', value: '' }, profiles: [], validation: [] };
}
function addSection() { sections.value.push({ title: `Section ${sections.value.length + 1}`, columns: 2, fields: [] }); }
function removeSection(i: number) { sections.value.splice(i, 1); }
function removeField(s: number, i: number) { sections.value[s].fields.splice(i, 1); }
</script>
<style scoped>
.fld { display: grid; grid-template-columns: 150px 1fr 210px; gap: 12px; min-height: 320px; }
.fld-pane-title { font-size: 12px; font-weight: 600; color: #666; margin-bottom: 8px; text-transform: uppercase; }
.fld-palette-list { display: flex; flex-direction: column; gap: 6px; }
.fld-palette-item { padding: 6px 10px; background: #f5f5f5; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 12px; cursor: grab; }
.fld-canvas { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fafafa; display: flex; flex-direction: column; gap: 12px; }
.fld-empty { color: #bbb; font-size: 12px; text-align: center; padding: 32px 0; }
.fld-section { background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 10px; }
.fld-section-head { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.fld-fields { display: grid; gap: 8px; min-height: 48px; }
.fld-field { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border: 1px dashed #d9d9d9; border-radius: 6px; font-size: 12px; background: #fff; cursor: pointer; }
.fld-field.selected { border-color: #1677ff; border-style: solid; }
.fld-field.dimmed { opacity: 0.4; }
.fld-canvas.phone { max-width: 375px; margin: 0 auto; width: 100%; }
.fld-field-name { font-weight: 600; }
.fld-field-type { color: #999; }
.fld-req { color: #ff4d4f; }
.fld-val { color: #52c41a; font-size: 11px; }
.fld-rule { display: flex; gap: 4px; align-items: center; margin-bottom: 6px; }
.fld-inspector { border-left: 1px solid #eee; padding-left: 12px; }
.fld-hint { color: #bbb; font-size: 12px; }
</style>
