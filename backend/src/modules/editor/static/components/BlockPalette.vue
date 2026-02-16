<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Layout, Columns3, Type, ImageIcon, MousePointerClick,
  MoveVertical, Minus, Video, Quote, Code2, AlertTriangle,
  FileCode2, Table2, Heading1, List, ListOrdered, Search
} from 'lucide-vue-next';

const props = defineProps<{
  editor: any;
}>();

const searchQuery = ref('');

const blockCategories = [
  {
    name: 'Layout',
    blocks: [
      {
        name: 'Section',
        icon: Layout,
        description: 'Full-width section wrapper',
        action: () => insertBlock('sectionBlock', { content: [{ type: 'paragraph' }] }),
      },
      {
        name: '2 Columns',
        icon: Columns3,
        description: 'Two column layout',
        action: () => insertColumns(2),
      },
      {
        name: '3 Columns',
        icon: Columns3,
        description: 'Three column layout',
        action: () => insertColumns(3),
      },
      {
        name: 'Spacer',
        icon: MoveVertical,
        description: 'Add vertical space',
        action: () => insertBlock('spacerBlock'),
      },
      {
        name: 'Divider',
        icon: Minus,
        description: 'Horizontal divider line',
        action: () => props.editor?.chain().focus().setHorizontalRule().run(),
      },
    ],
  },
  {
    name: 'Text',
    blocks: [
      {
        name: 'Heading',
        icon: Heading1,
        description: 'Section heading',
        action: () => props.editor?.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        name: 'Paragraph',
        icon: Type,
        description: 'Plain text paragraph',
        action: () => props.editor?.chain().focus().setParagraph().run(),
      },
      {
        name: 'Bullet List',
        icon: List,
        description: 'Unordered list',
        action: () => props.editor?.chain().focus().toggleBulletList().run(),
      },
      {
        name: 'Numbered List',
        icon: ListOrdered,
        description: 'Ordered list',
        action: () => props.editor?.chain().focus().toggleOrderedList().run(),
      },
      {
        name: 'Quote',
        icon: Quote,
        description: 'Block quotation',
        action: () => props.editor?.chain().focus().toggleBlockquote().run(),
      },
      {
        name: 'Code Block',
        icon: Code2,
        description: 'Code snippet',
        action: () => props.editor?.chain().focus().toggleCodeBlock().run(),
      },
    ],
  },
  {
    name: 'Media',
    blocks: [
      {
        name: 'Image',
        icon: ImageIcon,
        description: 'Image with caption',
        action: () => insertBlock('imageBlock'),
      },
      {
        name: 'Video',
        icon: Video,
        description: 'YouTube or Vimeo embed',
        action: () => insertBlock('videoBlock'),
      },
    ],
  },
  {
    name: 'Interactive',
    blocks: [
      {
        name: 'Button',
        icon: MousePointerClick,
        description: 'Call-to-action button',
        action: () => insertBlock('buttonBlock'),
      },
      {
        name: 'Callout',
        icon: AlertTriangle,
        description: 'Info/warning callout box',
        action: () => insertBlock('calloutBlock', { content: [{ type: 'paragraph' }] }),
      },
    ],
  },
  {
    name: 'Advanced',
    blocks: [
      {
        name: 'HTML',
        icon: FileCode2,
        description: 'Custom HTML code',
        action: () => insertBlock('htmlBlock'),
      },
      {
        name: 'Table',
        icon: Table2,
        description: 'Data table',
        action: () => props.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      },
    ],
  },
];

const filteredCategories = computed(() => {
  if (!searchQuery.value) return blockCategories;
  const q = searchQuery.value.toLowerCase();
  return blockCategories
    .map(cat => ({
      ...cat,
      blocks: cat.blocks.filter(b =>
        b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q)
      ),
    }))
    .filter(cat => cat.blocks.length > 0);
});

function insertBlock(type: string, extra?: Record<string, any>) {
  if (!props.editor) return;
  const node: any = { type };
  if (extra) Object.assign(node, extra);
  props.editor.chain().focus().insertContent(node).run();
}

function insertColumns(count: number) {
  if (!props.editor) return;
  const columns = Array.from({ length: count }, () => ({
    type: 'columnBlock',
    content: [{ type: 'paragraph' }],
  }));
  props.editor.chain().focus().insertContent({
    type: 'columnsBlock',
    attrs: { columns: count },
    content: columns,
  }).run();
}
</script>

<template>
  <div class="block-palette">
    <div class="palette-header">
      <h4>Blocks</h4>
    </div>
    <div class="palette-search">
      <a-input
        v-model:value="searchQuery"
        placeholder="Search blocks..."
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
