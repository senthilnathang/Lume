<template>
  <Teleport to="body">
    <Transition name="picker-fade">
      <div v-if="visible" class="picker-backdrop" @click.self="$emit('close')">
        <div class="picker-panel" role="dialog" aria-modal="true" aria-label="Insert widget">

          <!-- Header -->
          <div class="picker-header">
            <h3 class="picker-title">Insert Widget</h3>
            <input
              v-model="search"
              class="picker-search"
              type="text"
              placeholder="Search widgets…"
              autofocus
            />
            <button class="picker-close" title="Close" @click="$emit('close')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Widget grid -->
          <div class="picker-body">
            <template v-for="cat in visibleCategories" :key="cat.name">
              <div class="cat-label">{{ cat.label }}</div>
              <div class="cat-grid">
                <button
                  v-for="w in cat.widgets"
                  :key="w.type"
                  class="widget-card"
                  :title="w.description"
                  @click="pick(w.type)"
                >
                  <span class="widget-icon" :style="{ background: catColor(w.category) }">
                    <!-- Generic icon SVG for each widget -->
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                      <path v-if="w.category === 'layout'" stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zm9.75-9.75A2.25 2.25 0 0115.75 3.75H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                      <path v-else-if="w.category === 'media'" stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      <path v-else-if="w.category === 'interactive'" stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
                      <path v-else-if="w.category === 'commercial'" stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                      <path v-else stroke-linecap="round" stroke-linejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                    </svg>
                  </span>
                  <span class="widget-name">{{ w.name }}</span>
                </button>
              </div>
            </template>

            <div v-if="visibleCategories.length === 0" class="picker-empty">
              No widgets match "{{ search }}"
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { widgetRegistry, type WidgetCategory } from '@widgets/registry'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'pick', type: string): void
}>()

const search = ref('')

const categoryOrder: WidgetCategory[] = [
  'layout', 'content', 'media', 'interactive', 'commercial', 'utility', 'social', 'navigation', 'global',
]

const categoryLabels: Record<WidgetCategory, string> = {
  layout: 'Layout',
  content: 'Content',
  media: 'Media',
  interactive: 'Interactive',
  commercial: 'Commercial',
  utility: 'Utility',
  social: 'Social',
  navigation: 'Navigation',
  global: 'Global',
}

const categoryColors: Record<WidgetCategory, string> = {
  layout: '#3b82f6',
  content: '#22c55e',
  media: '#a855f7',
  interactive: '#f97316',
  commercial: '#eab308',
  utility: '#06b6d4',
  social: '#ec4899',
  navigation: '#8b5cf6',
  global: '#6b7280',
}

// Exclude container-only types that aren't directly insertable at top level
const EXCLUDED = new Set(['columnBlock'])

const visibleCategories = computed(() => {
  const q = search.value.trim().toLowerCase()
  return categoryOrder
    .map(cat => ({
      name: cat,
      label: categoryLabels[cat],
      widgets: widgetRegistry.filter(w =>
        w.category === cat &&
        !EXCLUDED.has(w.type) &&
        (!q || w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q))
      ),
    }))
    .filter(c => c.widgets.length > 0)
})

function catColor(cat: WidgetCategory) {
  return categoryColors[cat] || '#6b7280'
}

function pick(type: string) {
  emit('pick', type)
}

// Close on Escape
if (import.meta.client) {
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') emit('close')
  }
  onMounted(() => document.addEventListener('keydown', handleKey))
  onUnmounted(() => document.removeEventListener('keydown', handleKey))
}

// Reset search each time the picker opens
watch(() => props.visible, (v) => { if (v) search.value = '' })
</script>

<style scoped>
.picker-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 10100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.picker-panel {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 680px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.picker-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.picker-title {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
  margin: 0;
}

.picker-search {
  flex: 1;
  padding: 7px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 13px;
  color: #1f2937;
  outline: none;
  transition: border-color 0.15s;
  background: #f9fafb;
}
.picker-search:focus {
  border-color: #3b82f6;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.12);
}
.picker-search::placeholder { color: #9ca3af; }

.picker-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: #9ca3af;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.picker-close:hover { background: #f3f4f6; color: #374151; }

.picker-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.cat-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9ca3af;
  margin: 12px 0 8px;
}
.cat-label:first-child { margin-top: 0; }

.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 6px;
}

.widget-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 12px 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}
.widget-card:hover {
  border-color: #3b82f6;
  background: #eff6ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.widget-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.widget-name {
  font-size: 11px;
  font-weight: 500;
  color: #374151;
  line-height: 1.3;
  word-break: break-word;
}

.picker-empty {
  text-align: center;
  padding: 40px 16px;
  color: #9ca3af;
  font-size: 13px;
}

/* Transitions */
.picker-fade-enter-active,
.picker-fade-leave-active {
  transition: opacity 0.2s ease;
}
.picker-fade-enter-active .picker-panel,
.picker-fade-leave-active .picker-panel {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.picker-fade-enter-from,
.picker-fade-leave-to {
  opacity: 0;
}
.picker-fade-enter-from .picker-panel,
.picker-fade-leave-to .picker-panel {
  transform: scale(0.95);
  opacity: 0;
}
</style>
