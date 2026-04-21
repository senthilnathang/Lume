<template>
  <Transition name="slide-right">
    <div v-if="visible && block" class="settings-panel">
      <div class="panel-header">
        <div class="panel-title">
          <span class="widget-badge" :style="{ background: categoryColor }">{{ widgetDef?.category || 'block' }}</span>
          <h3>{{ widgetDef?.name || blockType }}</h3>
        </div>
        <button class="panel-close" @click="$emit('close')">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Section tabs -->
      <div v-if="sections.length > 1" class="panel-tabs">
        <button
          v-for="s in sections"
          :key="s"
          class="panel-tab"
          :class="{ active: activeSection === s }"
          @click="activeSection = s"
        >
          {{ s.charAt(0).toUpperCase() + s.slice(1) }}
        </button>
      </div>

      <div class="panel-body">
        <template v-for="attr in activeSectionAttrs" :key="attr.key">
          <div class="field-group">
            <label class="field-label">{{ attr.label }}</label>

            <!-- Text -->
            <input
              v-if="attr.type === 'text'"
              type="text"
              class="field-input"
              :value="attrs[attr.key] ?? attr.default ?? ''"
              @input="emitUpdate(attr.key, ($event.target as HTMLInputElement).value)"
            />

            <!-- Textarea -->
            <textarea
              v-else-if="attr.type === 'textarea'"
              class="field-textarea"
              rows="3"
              :value="attrs[attr.key] ?? attr.default ?? ''"
              @input="emitUpdate(attr.key, ($event.target as HTMLTextAreaElement).value)"
            />

            <!-- Number -->
            <input
              v-else-if="attr.type === 'number'"
              type="number"
              class="field-input"
              :min="attr.min"
              :max="attr.max"
              :step="attr.step || 1"
              :value="attrs[attr.key] ?? attr.default ?? 0"
              @input="emitUpdate(attr.key, Number(($event.target as HTMLInputElement).value))"
            />

            <!-- Slider -->
            <div v-else-if="attr.type === 'slider'" class="field-slider-wrap">
              <input
                type="range"
                class="field-slider"
                :min="attr.min ?? 0"
                :max="attr.max ?? 100"
                :step="attr.step || 1"
                :value="attrs[attr.key] ?? attr.default ?? 0"
                @input="emitUpdate(attr.key, Number(($event.target as HTMLInputElement).value))"
              />
              <span class="slider-value">{{ attrs[attr.key] ?? attr.default ?? 0 }}</span>
            </div>

            <!-- Color -->
            <div v-else-if="attr.type === 'color'" class="field-color-wrap">
              <input
                type="color"
                class="field-color"
                :value="attrs[attr.key] || attr.default || '#000000'"
                @input="emitUpdate(attr.key, ($event.target as HTMLInputElement).value)"
              />
              <input
                type="text"
                class="field-input field-color-text"
                :value="attrs[attr.key] || attr.default || ''"
                @input="emitUpdate(attr.key, ($event.target as HTMLInputElement).value)"
              />
            </div>

            <!-- Select -->
            <select
              v-else-if="attr.type === 'select'"
              class="field-select"
              :value="attrs[attr.key] ?? attr.default ?? ''"
              @change="emitUpdate(attr.key, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="opt in attr.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <!-- Switch -->
            <label v-else-if="attr.type === 'switch'" class="field-switch">
              <input
                type="checkbox"
                :checked="attrs[attr.key] ?? attr.default ?? false"
                @change="emitUpdate(attr.key, ($event.target as HTMLInputElement).checked)"
              />
              <span class="switch-track"><span class="switch-thumb" /></span>
              <span class="switch-label">{{ attrs[attr.key] ? 'On' : 'Off' }}</span>
            </label>

            <!-- URL -->
            <input
              v-else-if="attr.type === 'url' || attr.type === 'image'"
              type="url"
              class="field-input"
              placeholder="https://..."
              :value="attrs[attr.key] ?? attr.default ?? ''"
              @input="emitUpdate(attr.key, ($event.target as HTMLInputElement).value)"
            />

            <!-- Alignment -->
            <div v-else-if="attr.type === 'alignment'" class="field-alignment">
              <button
                v-for="opt in ['left', 'center', 'right']"
                :key="opt"
                class="align-btn"
                :class="{ active: (attrs[attr.key] ?? attr.default ?? 'left') === opt }"
                @click="emitUpdate(attr.key, opt)"
              >
                <svg v-if="opt === 'left'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" d="M3 6h18M3 12h12M3 18h15" /></svg>
                <svg v-else-if="opt === 'center'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" d="M3 6h18M6 12h12M4 18h16" /></svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" d="M3 6h18M9 12h12M6 18h15" /></svg>
              </button>
            </div>

            <!-- Fallback: text input -->
            <input
              v-else
              type="text"
              class="field-input"
              :value="attrs[attr.key] ?? attr.default ?? ''"
              @input="emitUpdate(attr.key, ($event.target as HTMLInputElement).value)"
            />
          </div>
        </template>

        <div v-if="!activeSectionAttrs.length" class="empty-state">
          No settings available for this section.
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { widgetRegistry, type WidgetDef, type AttrSchema } from '@widgets/registry'

const props = defineProps<{
  visible: boolean
  block: any
  blockType: string
}>()

const emit = defineEmits(['close', 'update:attr'])

const activeSection = ref<string>('content')

const widgetDef = computed<WidgetDef | undefined>(() =>
  widgetRegistry.find(w => w.type === props.blockType)
)

const categoryColors: Record<string, string> = {
  layout: '#3b82f6',
  content: '#22c55e',
  media: '#a855f7',
  interactive: '#f97316',
  commercial: '#eab308',
  utility: '#06b6d4',
  social: '#ec4899',
}

const categoryColor = computed(() =>
  categoryColors[widgetDef.value?.category || ''] || '#6b7280'
)

const attrs = computed(() => props.block?.attrs || {})

const sections = computed(() => {
  if (!widgetDef.value) return ['content']
  const allSections = [...new Set(widgetDef.value.attributes.map(a => a.section))]
  return allSections.length ? allSections : ['content']
})

const activeSectionAttrs = computed<AttrSchema[]>(() => {
  if (!widgetDef.value) return []
  return widgetDef.value.attributes.filter(a => a.section === activeSection.value)
})

function emitUpdate(key: string, value: any) {
  emit('update:attr', key, value)
}

// Reset active section when block type changes
watch(() => props.blockType, () => {
  activeSection.value = 'content'
})
</script>

<style scoped>
.settings-panel {
  position: fixed;
  top: 48px;
  right: 0;
  bottom: 0;
  width: 340px;
  background: white;
  border-left: 1px solid #e5e7eb;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title h3 {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.widget-badge {
  font-size: 10px;
  font-weight: 600;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.panel-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #9ca3af;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.panel-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
  padding: 0 16px;
}

.panel-tab {
  padding: 8px 16px;
  border: none;
  background: none;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}
.panel-tab:hover { color: #374151; }
.panel-tab.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.field-group {
  margin-bottom: 16px;
}

.field-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #4b5563;
  margin-bottom: 4px;
}

.field-input, .field-textarea, .field-select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  color: #1f2937;
  background: white;
  outline: none;
  transition: border-color 0.15s;
}
.field-input:focus, .field-textarea:focus, .field-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.field-textarea { resize: vertical; }
.field-select { cursor: pointer; }

.field-slider-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}
.field-slider {
  flex: 1;
  -webkit-appearance: none;
  height: 4px;
  border-radius: 2px;
  background: #e5e7eb;
  outline: none;
}
.field-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
}
.slider-value {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  min-width: 32px;
  text-align: right;
}

.field-color-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.field-color {
  width: 32px;
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  padding: 2px;
}
.field-color-text { flex: 1; }

.field-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.field-switch input { display: none; }
.switch-track {
  width: 36px;
  height: 20px;
  background: #d1d5db;
  border-radius: 10px;
  position: relative;
  transition: background 0.2s;
}
.field-switch input:checked + .switch-track { background: #3b82f6; }
.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}
.field-switch input:checked + .switch-track .switch-thumb { transform: translateX(16px); }
.switch-label { font-size: 12px; color: #6b7280; }

.field-alignment {
  display: flex;
  gap: 2px;
  background: #f3f4f6;
  border-radius: 6px;
  padding: 2px;
}
.align-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: none;
  background: transparent;
  color: #6b7280;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}
.align-btn:hover { color: #374151; }
.align-btn.active {
  background: white;
  color: #3b82f6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.empty-state {
  text-align: center;
  padding: 40px 16px;
  color: #9ca3af;
  font-size: 13px;
}

/* Transitions */
.slide-right-enter-active, .slide-right-leave-active {
  transition: transform 0.3s ease;
}
.slide-right-enter-from, .slide-right-leave-to {
  transform: translateX(100%);
}
</style>
