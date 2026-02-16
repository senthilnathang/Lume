<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Layout, Columns3, Type, ImageIcon, MousePointerClick,
  MoveVertical, Minus, Video, Quote, Code2, AlertTriangle,
  FileCode2, Table2, Heading1, List, ListOrdered, Search,
  Info, HelpCircle, CreditCard, ListChecks, UserCircle,
  MessageSquareQuote, Timer, ToggleLeft, Zap, Maximize2,
  MapPin, Mail, Clock, Share2, LayoutGrid, BarChart2,
  Grid3x3, type LucideIcon,
} from 'lucide-vue-next';
import { widgetRegistry, type WidgetDef, type WidgetCategory } from '../widgets/registry';

const props = defineProps<{
  editor: any;
}>();

const searchQuery = ref('');

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

  // Add widget registry blocks
  widgetRegistry.forEach(widget => {
    // Skip columnBlock from palette (it's auto-inserted with columns)
    if (widget.type === 'columnBlock') return;
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
      <h4>Widgets</h4>
    </div>
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
  padding: 12px 16px 8px;
  border-bottom: 1px solid #e5e7eb;
}
.palette-header h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
</style>
