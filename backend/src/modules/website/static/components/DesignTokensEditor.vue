<script setup lang="ts">
import { computed, ref } from 'vue';
import { Palette, Type, Download, Upload } from 'lucide-vue-next';

interface DesignTokens {
  colors: Record<string, string>;
  typography: Record<string, any>;
}

const props = defineProps<{
  modelValue: DesignTokens;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: DesignTokens): void;
}>();

const defaultColors: Record<string, string> = {
  primary: '#3b82f6',
  secondary: '#6366f1',
  accent: '#f59e0b',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#111827',
  textLight: '#6b7280',
  background: '#ffffff',
  surface: '#f9fafb',
};

const defaultTypography: Record<string, any> = {
  headingFont: 'Inter',
  bodyFont: 'Inter',
  baseFontSize: 16,
  lineHeight: 1.5,
  headingWeight: 600,
};

const colorLabels: Record<string, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  success: 'Success',
  warning: 'Warning',
  danger: 'Danger',
  text: 'Text',
  textLight: 'Text Light',
  background: 'Background',
  surface: 'Surface',
};

const colorKeys = Object.keys(defaultColors);

const headingWeightOptions = [
  { value: 400, label: '400 (Normal)' },
  { value: 500, label: '500 (Medium)' },
  { value: 600, label: '600 (Semi Bold)' },
  { value: 700, label: '700 (Bold)' },
];

const colors = computed(() => ({
  ...defaultColors,
  ...props.modelValue?.colors,
}));

const typography = computed(() => ({
  ...defaultTypography,
  ...props.modelValue?.typography,
}));

function updateColor(key: string, value: string) {
  const updated: DesignTokens = {
    colors: { ...colors.value, [key]: value },
    typography: { ...typography.value },
  };
  emit('update:modelValue', updated);
}

function updateTypography(key: string, value: any) {
  const updated: DesignTokens = {
    colors: { ...colors.value },
    typography: { ...typography.value, [key]: value },
  };
  emit('update:modelValue', updated);
}

// ── Import / Export ────────────────────────────────────────────────────────
const importing = ref(false);
const importJson = ref('');
const importError = ref('');

function exportJson() {
  const json = JSON.stringify(props.modelValue, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'design-tokens.json';
  a.click();
  URL.revokeObjectURL(url);
}

function startImport() {
  importing.value = true;
  importJson.value = '';
  importError.value = '';
}

function applyImport() {
  try {
    const parsed = JSON.parse(importJson.value);
    if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Must be an object');
    emit('update:modelValue', {
      colors: typeof parsed.colors === 'object' ? parsed.colors : colors.value,
      typography: typeof parsed.typography === 'object' ? parsed.typography : typography.value,
    });
    importing.value = false;
    importError.value = '';
  } catch {
    importError.value = 'Invalid JSON — expected { colors: {...}, typography: {...} }';
  }
}

function isLight(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}
</script>

<template>
  <div class="design-tokens-editor">
    <!-- Color Palette Section -->
    <div class="tokens-section">
      <div class="section-header">
        <Palette :size="18" class="section-icon" />
        <span class="section-title">Color Palette</span>
      </div>
      <div class="color-grid">
        <div
          v-for="key in colorKeys"
          :key="key"
          class="color-swatch-card"
        >
          <div
            class="color-preview"
            :style="{ backgroundColor: colors[key] }"
          >
            <input
              type="color"
              :value="colors[key]"
              class="color-picker-input"
              @input="updateColor(key, ($event.target as HTMLInputElement).value)"
            />
            <span
              class="color-preview-label"
              :style="{ color: isLight(colors[key]) ? '#111827' : '#ffffff' }"
            >
              {{ colors[key] }}
            </span>
          </div>
          <div class="swatch-footer">
            <span class="swatch-label">{{ colorLabels[key] }}</span>
            <a-input
              :value="colors[key]"
              size="small"
              class="hex-input"
              @change="updateColor(key, ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Typography Section -->
    <div class="tokens-section">
      <div class="section-header">
        <Type :size="18" class="section-icon" />
        <span class="section-title">Typography</span>
      </div>
      <div class="typography-grid">
        <div class="typo-field">
          <label class="typo-label">Heading Font</label>
          <a-input
            :value="typography.headingFont"
            placeholder="e.g. Inter, Roboto"
            @change="updateTypography('headingFont', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="typo-field">
          <label class="typo-label">Body Font</label>
          <a-input
            :value="typography.bodyFont"
            placeholder="e.g. Inter, Open Sans"
            @change="updateTypography('bodyFont', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="typo-field">
          <label class="typo-label">Base Font Size: {{ typography.baseFontSize }}px</label>
          <a-slider
            :value="typography.baseFontSize"
            :min="12"
            :max="24"
            :step="1"
            @change="(val: number) => updateTypography('baseFontSize', val)"
          />
        </div>
        <div class="typo-field">
          <label class="typo-label">Line Height: {{ typography.lineHeight }}</label>
          <a-slider
            :value="typography.lineHeight"
            :min="1.0"
            :max="2.0"
            :step="0.1"
            @change="(val: number) => updateTypography('lineHeight', val)"
          />
        </div>
        <div class="typo-field">
          <label class="typo-label">Heading Weight</label>
          <a-select
            :value="typography.headingWeight"
            :options="headingWeightOptions"
            style="width: 100%"
            @change="(val: number) => updateTypography('headingWeight', val)"
          />
        </div>
      </div>
    </div>
    <!-- Import / Export -->
    <div class="tokens-section">
      <div class="section-header">
        <Download :size="18" class="section-icon" />
        <span class="section-title">Import / Export</span>
      </div>
      <div class="ie-bar">
        <a-button size="small" @click="exportJson">
          <template #icon><Download :size="13" /></template>
          Export JSON
        </a-button>
        <a-button size="small" @click="startImport">
          <template #icon><Upload :size="13" /></template>
          Import JSON
        </a-button>
      </div>
      <template v-if="importing">
        <a-textarea
          v-model:value="importJson"
          placeholder='{ "colors": { "primary": "#3b82f6" }, "typography": { "headingFont": "Inter" } }'
          :rows="6"
          style="font-family: monospace; font-size: 12px; margin-top: 8px;"
        />
        <p v-if="importError" class="import-error">{{ importError }}</p>
        <div class="ie-bar" style="margin-top: 8px;">
          <a-button type="primary" size="small" @click="applyImport">Apply</a-button>
          <a-button size="small" @click="importing = false">Cancel</a-button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.design-tokens-editor {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.tokens-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.section-icon {
  color: #6b7280;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.color-swatch-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.color-swatch-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.color-preview {
  position: relative;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.color-picker-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: none;
  padding: 0;
}

.color-preview-label {
  font-size: 12px;
  font-weight: 500;
  font-family: monospace;
  pointer-events: none;
  text-transform: uppercase;
}

.swatch-footer {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.swatch-label {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
}

.hex-input {
  font-size: 12px;
  font-family: monospace;
}

.typography-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.typo-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.typo-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.ie-bar {
  display: flex;
  gap: 8px;
}

.import-error {
  margin: 6px 0 0;
  font-size: 12px;
  color: #ef4444;
}

@media (max-width: 900px) {
  .color-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 600px) {
  .color-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .typography-grid {
    grid-template-columns: 1fr;
  }
}
</style>
