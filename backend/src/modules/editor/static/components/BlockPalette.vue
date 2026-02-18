<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Layout, Columns3, Type, ImageIcon, MousePointerClick,
  MoveVertical, Minus, Video, Quote, Code2, AlertTriangle,
  FileCode2, Table2, Heading1, List, ListOrdered, Search,
  Info, HelpCircle, CreditCard, ListChecks, UserCircle,
  MessageSquareQuote, Timer, ToggleLeft, Zap, Maximize2,
  MapPin, Mail, Clock, Share2, LayoutGrid, BarChart2,
  Grid3x3, Bookmark, Globe, Plus,
  // Phase 9 icons
  LayoutList, ChevronsUpDown, Hash, Star, Code,
  Volume2, Columns2, Sparkles, Menu, ChevronRight,
  Presentation, Loader, MessageCircle,
  type LucideIcon,
} from 'lucide-vue-next';
import { widgetRegistry, type WidgetDef, type WidgetCategory } from '../widgets/registry';
import { get, post } from '@/api/request';

const props = defineProps<{
  editor: any;
}>();

const WIDGET_STORAGE_KEY = 'lume_enabled_widgets';

const searchQuery = ref('');
const activeTab = ref<'widgets' | 'saved' | 'global'>('widgets');
const savedBlocks = ref<any[]>([]);
const loadingSaved = ref(false);
const globalWidgets = ref<any[]>([]);
const loadingGlobal = ref(false);

// Load widget enabled/disabled state from localStorage (set by Widget Manager)
function getEnabledWidgets(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(WIDGET_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function isWidgetEnabled(type: string): boolean {
  const state = getEnabledWidgets();
  // If no state recorded yet (fresh install), default all to enabled
  if (Object.keys(state).length === 0) return true;
  return state[type] !== false;
}

async function loadSavedBlocks() {
  loadingSaved.value = true;
  try {
    const result = await get('/editor/snippets');
    savedBlocks.value = (result.data || result || []).filter((s: any) => s.content);
  } catch {
    savedBlocks.value = [];
  } finally {
    loadingSaved.value = false;
  }
}

function insertSavedBlock(block: any) {
  if (!props.editor || !block.content) return;
  try {
    const content = typeof block.content === 'string' ? JSON.parse(block.content) : block.content;
    props.editor.chain().focus().insertContent(content).run();
    // Increment usage count
    post(`/editor/snippets/${block.id}/use`).catch(() => {});
  } catch {
    // Try inserting as raw content
    props.editor.chain().focus().insertContent(block.content).run();
  }
}

async function loadGlobalWidgets() {
  loadingGlobal.value = true;
  try {
    const result = await get('/editor/global-widgets');
    const rows = result?.rows || result?.data || (Array.isArray(result) ? result : []);
    globalWidgets.value = rows;
  } catch {
    globalWidgets.value = [];
  } finally {
    loadingGlobal.value = false;
  }
}

function insertGlobalWidget(widget: any) {
  if (!props.editor) return;
  props.editor.chain().focus().insertContent({
    type: 'globalWidgetBlock',
    attrs: {
      globalWidgetId: widget.id,
      name: widget.name,
    },
  }).run();
}

onMounted(() => {
  loadSavedBlocks();
});

// Map lucide icon names to components
const iconMap: Record<string, LucideIcon> = {
  'layout': Layout,
  'columns-3': Columns3,
  'image': ImageIcon,
  'mouse-pointer-click': MousePointerClick,
  'move-vertical': MoveVertical,
  'video': Video,
  'alert-triangle': AlertTriangle,
  'file-code-2': FileCode2,
  'heading': Heading1,
  'type': Type,
  'info': Info,
  'help-circle': HelpCircle,
  'credit-card': CreditCard,
  'list': List,
  'list-checks': ListChecks,
  'user-circle': UserCircle,
  'quote': MessageSquareQuote,
  'timer': Timer,
  'toggle-left': ToggleLeft,
  'zap': Zap,
  'maximize-2': Maximize2,
  'map-pin': MapPin,
  'mail': Mail,
  'clock': Clock,
  'share-2': Share2,
  'layout-grid': LayoutGrid,
  'bar-chart-2': BarChart2,
  'grid-3x3': Grid3x3,
  // Phase 9 icons
  'globe': Globe,
  'layout-list': LayoutList,
  'chevrons-up-down': ChevronsUpDown,
  'hash': Hash,
  'star': Star,
  'code-2': Code2,
  'volume-2': Volume2,
  'columns-2': Columns2,
  'sparkles': Sparkles,
  'menu': Menu,
  'chevron-right': ChevronRight,
  'search': Search,
  'presentation': Presentation,
  'loader': Loader,
  'message-circle': MessageCircle,
};

function getIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || Layout;
}

// Category display config
const categoryConfig: Record<WidgetCategory | string, { label: string; order: number }> = {
  layout: { label: 'Layout', order: 1 },
  content: { label: 'Content', order: 2 },
  media: { label: 'Media', order: 3 },
  interactive: { label: 'Interactive', order: 4 },
  commercial: { label: 'Commercial', order: 5 },
  utility: { label: 'Utility', order: 6 },
  social: { label: 'Social', order: 7 },
  navigation: { label: 'Navigation', order: 8 },
  global: { label: 'Global', order: 9 },
  text: { label: 'Text', order: 0 },
};

// Built-in text/format blocks that aren't custom widgets
interface PaletteBlock {
  name: string;
  icon: LucideIcon;
  description: string;
  action: () => void;
  category: string;
}

const textBlocks = computed<PaletteBlock[]>(() => [
  {
    name: 'Heading',
    icon: Heading1,
    description: 'Section heading',
    action: () => props.editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    category: 'text',
  },
  {
    name: 'Paragraph',
    icon: Type,
    description: 'Plain text paragraph',
    action: () => props.editor?.chain().focus().setParagraph().run(),
    category: 'text',
  },
  {
    name: 'Bullet List',
    icon: List,
    description: 'Unordered list',
    action: () => props.editor?.chain().focus().toggleBulletList().run(),
    category: 'text',
  },
  {
    name: 'Numbered List',
    icon: ListOrdered,
    description: 'Ordered list',
    action: () => props.editor?.chain().focus().toggleOrderedList().run(),
    category: 'text',
  },
  {
    name: 'Quote',
    icon: Quote,
    description: 'Block quotation',
    action: () => props.editor?.chain().focus().toggleBlockquote().run(),
    category: 'text',
  },
  {
    name: 'Code Block',
    icon: Code2,
    description: 'Code snippet',
    action: () => props.editor?.chain().focus().toggleCodeBlock().run(),
    category: 'text',
  },
  {
    name: 'Divider',
    icon: Minus,
    description: 'Horizontal divider line',
    action: () => props.editor?.chain().focus().setHorizontalRule().run(),
    category: 'layout',
  },
  {
    name: 'Table',
    icon: Table2,
    description: 'Data table',
    action: () => props.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    category: 'utility',
  },
]);

// Convert widget registry entries to palette blocks
function widgetToBlock(widget: WidgetDef): PaletteBlock {
  return {
    name: widget.name,
    icon: getIcon(widget.icon),
    description: widget.description,
    action: () => insertWidget(widget),
    category: widget.category,
  };
}

function insertWidget(widget: WidgetDef) {
  if (!props.editor) return;
  const node: any = { type: widget.type };

  // Container blocks need default content
  if (widget.isContainer) {
    if (widget.type === 'columnsBlock') {
      const count = widget.defaults.columns || 2;
      node.attrs = { columns: count };
      node.content = Array.from({ length: count }, () => ({
        type: 'columnBlock',
        content: [{ type: 'paragraph' }],
      }));
    } else {
      node.content = [{ type: 'paragraph' }];
    }
  }

  props.editor.chain().focus().insertContent(node).run();
}

// Combine widget registry + text blocks into categories
const allCategories = computed(() => {
  const catMap: Record<string, PaletteBlock[]> = {};

  // Add text blocks
  textBlocks.value.forEach(b => {
    if (!catMap[b.category]) catMap[b.category] = [];
    catMap[b.category].push(b);
  });

  // Add widget registry blocks (skip disabled ones)
  widgetRegistry.forEach(widget => {
    // Skip columnBlock from palette (it's auto-inserted with columns)
    if (widget.type === 'columnBlock') return;
    // Skip widgets disabled in Widget Manager
    if (!isWidgetEnabled(widget.type)) return;
    const cat = widget.category;
    if (!catMap[cat]) catMap[cat] = [];
    catMap[cat].push(widgetToBlock(widget));
  });

  // Sort and structure
  return Object.keys(catMap)
    .sort((a, b) => (categoryConfig[a]?.order ?? 99) - (categoryConfig[b]?.order ?? 99))
    .map(cat => ({
      name: categoryConfig[cat]?.label || cat.charAt(0).toUpperCase() + cat.slice(1),
      blocks: catMap[cat],
    }));
});

const filteredCategories = computed(() => {
  if (!searchQuery.value) return allCategories.value;
  const q = searchQuery.value.toLowerCase();
  return allCategories.value
    .map(cat => ({
      ...cat,
      blocks: cat.blocks.filter(b =>
        b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q)
      ),
    }))
    .filter(cat => cat.blocks.length > 0);
});
</script>

<template>
  <div class="block-palette">
    <div class="palette-header">
      <div class="palette-tabs">
        <button :class="['palette-tab', activeTab === 'widgets' && 'active']" @click="activeTab = 'widgets'">Widgets</button>
        <button :class="['palette-tab', activeTab === 'saved' && 'active']" @click="activeTab = 'saved'; loadSavedBlocks()">Saved</button>
        <button :class="['palette-tab', activeTab === 'global' && 'active']" @click="activeTab = 'global'; loadGlobalWidgets()">Global</button>
      </div>
    </div>

    <!-- Widgets Tab -->
    <template v-if="activeTab === 'widgets'">
      <div class="palette-search">
        <a-input
          v-model:value="searchQuery"
          placeholder="Search widgets..."
          size="small"
          allow-clear
        >
          <template #prefix><Search :size="14" class="text-gray-400" /></template>
        </a-input>
      </div>
      <div class="palette-content">
        <div v-for="category in filteredCategories" :key="category.name" class="block-category">
          <div class="category-label">{{ category.name }}</div>
          <div class="category-blocks">
            <button
              v-for="block in category.blocks"
              :key="block.name"
              class="block-item"
              :title="block.description"
              @click="block.action"
            >
              <component :is="block.icon" :size="18" />
              <span class="block-name">{{ block.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Saved Blocks Tab -->
    <template v-else-if="activeTab === 'saved'">
      <div class="palette-content">
        <a-spin :spinning="loadingSaved" size="small">
          <div v-if="!savedBlocks.length && !loadingSaved" class="saved-empty">
            <Bookmark :size="24" class="text-gray-300 mx-auto mb-2" />
            <p class="text-xs text-gray-400">No saved blocks yet</p>
            <p class="text-[10px] text-gray-300">Select content in the editor and click "Save as Block"</p>
          </div>
          <div v-else class="saved-blocks-list">
            <button
              v-for="block in savedBlocks"
              :key="block.id"
              class="saved-block-item"
              :title="block.name"
              @click="insertSavedBlock(block)"
            >
              <Bookmark :size="14" class="text-blue-400 flex-shrink-0" />
              <div class="saved-block-info">
                <span class="saved-block-name">{{ block.name }}</span>
                <span v-if="block.category && block.category !== 'general'" class="saved-block-cat">{{ block.category }}</span>
              </div>
            </button>
          </div>
        </a-spin>
      </div>
    </template>

    <!-- Global Widgets Tab -->
    <template v-else-if="activeTab === 'global'">
      <div class="palette-content">
        <a-spin :spinning="loadingGlobal" size="small">
          <div v-if="!globalWidgets.length && !loadingGlobal" class="saved-empty">
            <Globe :size="24" class="text-gray-300 mx-auto mb-2" />
            <p class="text-xs text-gray-400">No global widgets yet</p>
            <p class="text-[10px] text-gray-300">Create global widgets via the editor API</p>
          </div>
          <div v-else class="saved-blocks-list">
            <button
              v-for="widget in globalWidgets"
              :key="widget.id"
              class="saved-block-item global-widget-item"
              :title="`Insert: ${widget.name}`"
              @click="insertGlobalWidget(widget)"
            >
              <Globe :size="14" class="text-blue-500 flex-shrink-0" />
              <div class="saved-block-info">
                <span class="saved-block-name">{{ widget.name }}</span>
                <span class="saved-block-cat global-badge">GLOBAL</span>
              </div>
              <Plus :size="12" class="text-gray-400 flex-shrink-0" />
            </button>
          </div>
        </a-spin>
      </div>
    </template>
  </div>
</template>

<style scoped>
.block-palette {
  width: 200px;
  border-right: 1px solid #e5e7eb;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.palette-header {
  padding: 8px 8px 0;
  border-bottom: 1px solid #e5e7eb;
}
.palette-tabs {
  display: flex;
  gap: 0;
}
.palette-tab {
  flex: 1;
  padding: 6px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}
.palette-tab:hover { color: #6b7280; }
.palette-tab.active {
  color: #1677ff;
  border-bottom-color: #1677ff;
}
.palette-search {
  padding: 8px 12px;
}
.palette-content {
  flex: 1;
  overflow-y: auto;
  padding: 4px 12px 12px;
}
.block-category {
  margin-bottom: 12px;
}
.category-label {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  padding: 0 4px;
}
.category-blocks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}
.block-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.15s;
  color: #6b7280;
}
.block-item:hover {
  border-color: #1677ff;
  color: #1677ff;
  background: #f0f5ff;
}
.block-name {
  font-size: 11px;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
}

/* Saved blocks */
.saved-empty {
  text-align: center;
  padding: 32px 12px;
}
.saved-blocks-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.saved-block-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  width: 100%;
}
.saved-block-item:hover {
  border-color: #1677ff;
  background: #f0f5ff;
}
.saved-block-info {
  min-width: 0;
  flex: 1;
}
.saved-block-name {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.saved-block-cat {
  display: block;
  font-size: 10px;
  color: #9ca3af;
}
.global-widget-item {
  border-color: #bfdbfe;
  background: #eff6ff;
}
.global-widget-item:hover {
  border-color: #2563eb;
  background: #dbeafe;
}
.global-badge {
  font-size: 9px;
  font-weight: 700;
  color: #2563eb;
  letter-spacing: 0.5px;
}
</style>
