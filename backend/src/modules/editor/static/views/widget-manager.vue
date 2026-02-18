<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Puzzle, Check, X } from 'lucide-vue-next';
import { widgetRegistry, type WidgetDef, type WidgetCategory } from '@modules/editor/static/widgets/registry';

defineOptions({ name: 'EditorWidgetManager' });

const STORAGE_KEY = 'lume_enabled_widgets';

const searchQuery = ref('');
const enabledWidgets = ref<Record<string, boolean>>({});

const categoryLabels: Record<WidgetCategory, string> = {
  layout: 'Layout',
  content: 'Content',
  media: 'Media',
  interactive: 'Interactive',
  commercial: 'Commercial',
  utility: 'Utility',
  social: 'Social',
  navigation: 'Navigation',
};

const categoryColors: Record<WidgetCategory, string> = {
  layout: 'blue',
  content: 'green',
  media: 'purple',
  interactive: 'orange',
  commercial: 'gold',
  utility: 'cyan',
  social: 'geekblue',
  navigation: 'volcano',
};

// Load enabled state from localStorage
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      enabledWidgets.value = JSON.parse(raw);
    } else {
      // Default: all enabled
      const defaults: Record<string, boolean> = {};
      widgetRegistry.forEach((w) => {
        defaults[w.type] = true;
      });
      enabledWidgets.value = defaults;
    }
  } catch {
    const defaults: Record<string, boolean> = {};
    widgetRegistry.forEach((w) => {
      defaults[w.type] = true;
    });
    enabledWidgets.value = defaults;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledWidgets.value));
}

function toggleWidget(widgetType: string, value: boolean) {
  enabledWidgets.value = { ...enabledWidgets.value, [widgetType]: value };
  saveState();
}

function enableAll() {
  const all: Record<string, boolean> = {};
  widgetRegistry.forEach((w) => { all[w.type] = true; });
  enabledWidgets.value = all;
  saveState();
}

function disableAll() {
  const all: Record<string, boolean> = {};
  widgetRegistry.forEach((w) => { all[w.type] = false; });
  enabledWidgets.value = all;
  saveState();
}

function isEnabled(widgetType: string): boolean {
  return enabledWidgets.value[widgetType] !== false;
}

const filteredWidgets = computed<WidgetDef[]>(() => {
  const q = searchQuery.value.toLowerCase();
  if (!q) return widgetRegistry;
  return widgetRegistry.filter(
    (w) =>
      w.name.toLowerCase().includes(q) ||
      w.description.toLowerCase().includes(q) ||
      w.category.toLowerCase().includes(q)
  );
});

const groupedWidgets = computed<Record<string, WidgetDef[]>>(() => {
  const groups: Record<string, WidgetDef[]> = {};
  filteredWidgets.value.forEach((w) => {
    if (!groups[w.category]) groups[w.category] = [];
    groups[w.category].push(w);
  });
  return groups;
});

const categories = computed<WidgetCategory[]>(() =>
  Object.keys(groupedWidgets.value) as WidgetCategory[]
);

const enabledCount = computed(() =>
  widgetRegistry.filter((w) => isEnabled(w.type)).length
);

onMounted(() => {
  loadState();
});
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <Puzzle :size="20" class="text-indigo-600" />
        </div>
        <div>
          <h1 class="text-xl font-semibold m-0">Widget Manager</h1>
          <p class="text-sm text-gray-500 m-0">
            {{ enabledCount }} of {{ widgetRegistry.length }} widgets enabled
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <a-button size="small" @click="enableAll">
          <template #icon><Check :size="14" /></template>
          Enable All
        </a-button>
        <a-button size="small" danger @click="disableAll">
          <template #icon><X :size="14" /></template>
          Disable All
        </a-button>
      </div>
    </div>

    <!-- Search filter -->
    <div class="mb-6">
      <a-input
        v-model:value="searchQuery"
        placeholder="Search widgets by name, category, or description..."
        allow-clear
        style="max-width: 400px"
      />
    </div>

    <!-- Widget groups by category -->
    <div v-if="categories.length === 0" class="text-center py-12 text-gray-400">
      No widgets match your search.
    </div>

    <div v-for="category in categories" :key="category" class="mb-8">
      <!-- Category header -->
      <div class="flex items-center gap-2 mb-3">
        <a-tag :color="categoryColors[category]" style="margin: 0">
          {{ categoryLabels[category] || category }}
        </a-tag>
        <span class="text-xs text-gray-400">
          {{ groupedWidgets[category].length }} widget{{ groupedWidgets[category].length !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Widget cards grid -->
      <div class="grid grid-cols-1 gap-3" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))">
        <a-card
          v-for="widget in groupedWidgets[category]"
          :key="widget.type"
          size="small"
          :class="['widget-card', { 'widget-disabled': !isEnabled(widget.type) }]"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 flex-1 min-w-0">
              <!-- Widget icon placeholder -->
              <div class="widget-icon-box" :class="{ 'widget-icon-disabled': !isEnabled(widget.type) }">
                <Puzzle :size="16" />
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium text-sm" :class="{ 'text-gray-400': !isEnabled(widget.type) }">
                    {{ widget.name }}
                  </span>
                  <a-tag
                    v-if="widget.isContainer"
                    size="small"
                    color="blue"
                    style="font-size: 10px; padding: 0 4px; margin: 0"
                  >
                    Container
                  </a-tag>
                </div>
                <p class="text-xs text-gray-400 m-0 leading-relaxed">{{ widget.description }}</p>
                <div class="mt-1">
                  <code class="text-xs text-gray-400 bg-gray-50 px-1 rounded">{{ widget.type }}</code>
                </div>
              </div>
            </div>

            <!-- Toggle -->
            <a-switch
              :checked="isEnabled(widget.type)"
              size="small"
              @change="(val: boolean) => toggleWidget(widget.type, val)"
            />
          </div>
        </a-card>
      </div>
    </div>

    <!-- Info note -->
    <div class="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700">
      Widget enabled/disabled state is saved to your browser's localStorage (key: <code>{{ STORAGE_KEY }}</code>).
      Disabled widgets are hidden from the block palette in the page builder.
    </div>
  </div>
</template>

<style scoped>
.widget-card {
  transition: opacity 0.2s, border-color 0.2s;
}

.widget-disabled {
  opacity: 0.55;
}

.widget-icon-box {
  width: 34px;
  height: 34px;
  background: #eff6ff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4096ff;
  flex-shrink: 0;
  transition: background 0.2s, color 0.2s;
}

.widget-icon-disabled {
  background: #f3f4f6;
  color: #9ca3af;
}
</style>
