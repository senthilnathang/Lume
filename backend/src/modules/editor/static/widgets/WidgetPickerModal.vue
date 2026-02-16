<template>
  <a-modal
    :open="open"
    title="Insert Widget"
    :footer="null"
    :width="680"
    :bodyStyle="{ padding: '0', maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }"
    @cancel="$emit('close')"
  >
    <!-- Search bar -->
    <div class="widget-picker-search">
      <a-input
        v-model:value="searchText"
        placeholder="Search widgets..."
        size="large"
        allow-clear
      >
        <template #prefix>
          <Search :size="16" class="text-gray-400" />
        </template>
      </a-input>
    </div>

    <!-- Category tabs -->
    <div class="widget-picker-categories">
      <button
        :class="['category-chip', { active: selectedCategory === null }]"
        @click="selectedCategory = null"
      >
        All
      </button>
      <button
        v-for="[cat] in categories"
        :key="cat"
        :class="['category-chip', { active: selectedCategory === cat }]"
        @click="selectedCategory = selectedCategory === cat ? null : cat"
      >
        {{ categoryLabels[cat] || cat }}
      </button>
    </div>

    <!-- Widget grid -->
    <div class="widget-picker-grid-container">
      <div v-if="filtered.length === 0" class="widget-picker-empty">
        <p>No widgets found matching your search.</p>
      </div>
      <div v-else class="widget-picker-grid">
        <div
          v-for="widget in filtered"
          :key="widget.type"
          class="widget-card"
          @click="handleSelect(widget)"
        >
          <div class="widget-card-icon">
            <component :is="getIcon(widget.icon)" :size="24" />
          </div>
          <div class="widget-card-info">
            <div class="widget-card-name">{{ widget.name }}</div>
            <div class="widget-card-desc">{{ widget.description }}</div>
          </div>
          <a-tag :color="categoryColors[widget.category]" size="small" class="widget-card-cat">
            {{ categoryLabels[widget.category] || widget.category }}
          </a-tag>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { widgetRegistry, type WidgetDef, type WidgetCategory } from './registry';
import {
  Search, Layout, Columns, Image, Video, Type, AlignLeft, Square, Code,
  Heading, List, Quote, Minus, Star, DollarSign, Users, MessageSquare,
  Clock, ToggleLeft, MousePointer, AppWindow, MapPin, Mail, Timer, Share2,
  Newspaper, ListOrdered, BarChart, Box, Layers, PanelTop, Sparkles,
} from 'lucide-vue-next';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits(['close', 'select']);

const searchText = ref('');
const selectedCategory = ref<string | null>(null);

const categoryLabels: Record<string, string> = {
  layout: 'Layout',
  content: 'Content',
  media: 'Media',
  interactive: 'Interactive',
  commercial: 'Commercial',
  utility: 'Utility',
  social: 'Social',
};

const categoryColors: Record<string, string> = {
  layout: 'blue',
  content: 'green',
  media: 'purple',
  interactive: 'orange',
  commercial: 'gold',
  utility: 'cyan',
  social: 'magenta',
};

// Map icon names to components
const iconMap: Record<string, any> = {
  layout: Layout,
  columns: Columns,
  image: Image,
  video: Video,
  type: Type,
  'align-left': AlignLeft,
  square: Square,
  code: Code,
  heading: Heading,
  list: List,
  quote: Quote,
  minus: Minus,
  star: Star,
  'dollar-sign': DollarSign,
  users: Users,
  'message-square': MessageSquare,
  clock: Clock,
  'toggle-left': ToggleLeft,
  'mouse-pointer': MousePointer,
  popup: AppWindow,
  'map-pin': MapPin,
  mail: Mail,
  timer: Timer,
  'share-2': Share2,
  newspaper: Newspaper,
  'list-ordered': ListOrdered,
  'bar-chart': BarChart,
  box: Box,
  layers: Layers,
  'panel-top': PanelTop,
  sparkles: Sparkles,
};

function getIcon(name: string) {
  return iconMap[name] || Box;
}

const categories = computed(() => {
  const cats = new Map<string, WidgetDef[]>();
  for (const w of widgetRegistry) {
    if (!cats.has(w.category)) cats.set(w.category, []);
    cats.get(w.category)!.push(w);
  }
  return cats;
});

const filtered = computed(() => {
  let widgets = [...widgetRegistry];
  if (selectedCategory.value) {
    widgets = widgets.filter(w => w.category === selectedCategory.value);
  }
  if (searchText.value) {
    const q = searchText.value.toLowerCase();
    widgets = widgets.filter(w =>
      w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q)
    );
  }
  return widgets;
});

function handleSelect(widget: WidgetDef) {
  emit('select', widget.type);
  emit('close');
  searchText.value = '';
  selectedCategory.value = null;
}
</script>

<style scoped>
.widget-picker-search {
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.widget-picker-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.category-chip {
  padding: 4px 14px;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #4b5563;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.category-chip:hover {
  border-color: #93c5fd;
  color: #3b82f6;
}

.category-chip.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #3b82f6;
  font-weight: 500;
}

.widget-picker-grid-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.widget-picker-empty {
  text-align: center;
  padding: 40px 20px;
  color: #9ca3af;
  font-size: 14px;
}

.widget-picker-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.widget-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  background: #fff;
}

.widget-card:hover {
  border-color: #93c5fd;
  background: #f8faff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.08);
}

.widget-card-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 8px;
  color: #6b7280;
}

.widget-card:hover .widget-card-icon {
  background: #e0ecff;
  color: #3b82f6;
}

.widget-card-info {
  flex: 1;
  min-width: 0;
}

.widget-card-name {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.widget-card-desc {
  font-size: 11px;
  color: #9ca3af;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.widget-card-cat {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 10px;
  line-height: 1;
}
</style>
