<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import {
  Layers, Eye, EyeOff, GripVertical,
  ChevronRight, ChevronDown,
  Type, Image, Columns, Box, Square, Play, AlertCircle,
  Code, Minus, MousePointer, LayoutGrid
} from 'lucide-vue-next';

const props = defineProps<{
  editor: any;
}>();

interface TreeNode {
  key: string;
  type: string;
  label: string;
  pos: number;
  hidden: boolean;
  children: TreeNode[];
  depth: number;
}

const expandedKeys = ref<Set<string>>(new Set());
const hiddenBlocks = ref<Set<string>>(new Set());
const treeData = ref<TreeNode[]>([]);

const blockIcons: Record<string, any> = {
  paragraph: Type,
  heading: Type,
  image: Image,
  imageBlock: Image,
  columns: Columns,
  columnsBlock: Columns,
  column: Box,
  columnBlock: Box,
  section: LayoutGrid,
  sectionBlock: LayoutGrid,
  button: MousePointer,
  buttonBlock: MousePointer,
  spacer: Minus,
  spacerBlock: Minus,
  video: Play,
  videoBlock: Play,
  callout: AlertCircle,
  calloutBlock: AlertCircle,
  htmlBlock: Code,
  bulletList: Type,
  orderedList: Type,
  blockquote: Type,
  codeBlock: Code,
  table: Square,
};

function getBlockLabel(node: any): string {
  const type = node.type.name;
  // Try to extract meaningful text
  if (type === 'heading') {
    const level = node.attrs?.level || 1;
    const text = node.textContent?.slice(0, 30) || '';
    return `H${level}${text ? ': ' + text : ''}`;
  }
  if (type === 'paragraph') {
    const text = node.textContent?.slice(0, 30) || '';
    return text || 'Paragraph';
  }
  // Capitalize and clean up block name
  const name = type
    .replace(/Block$/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function buildTree(doc: any): TreeNode[] {
  const nodes: TreeNode[] = [];
  let keyCounter = 0;

  function walk(node: any, pos: number, depth: number): TreeNode[] {
    const result: TreeNode[] = [];
    let offset = 0;

    node.forEach((child: any, childOffset: number) => {
      const childPos = pos + childOffset + 1;
      const key = `node-${keyCounter++}`;
      const children = child.childCount > 0 && child.type.name !== 'paragraph'
        ? walk(child, childPos, depth + 1)
        : [];

      result.push({
        key,
        type: child.type.name,
        label: getBlockLabel(child),
        pos: childPos,
        hidden: hiddenBlocks.value.has(key),
        children,
        depth,
      });

      offset += child.nodeSize;
    });

    return result;
  }

  if (doc) {
    return walk(doc, 0, 0);
  }
  return nodes;
}

function refreshTree() {
  if (!props.editor) return;
  treeData.value = buildTree(props.editor.state.doc);
  // Auto-expand first level
  treeData.value.forEach(n => expandedKeys.value.add(n.key));
}

// Bind to editor updates
let boundEditor: any = null;

function bindEditor(ed: any) {
  if (boundEditor) {
    boundEditor.off('transaction', refreshTree);
  }
  boundEditor = ed;
  if (ed) {
    ed.on('transaction', refreshTree);
    refreshTree();
  }
}

watch(() => props.editor, (ed) => {
  if (ed) bindEditor(ed);
}, { immediate: true });

onBeforeUnmount(() => {
  if (boundEditor) {
    boundEditor.off('transaction', refreshTree);
  }
});

function toggleExpand(key: string) {
  if (expandedKeys.value.has(key)) {
    expandedKeys.value.delete(key);
  } else {
    expandedKeys.value.add(key);
  }
}

function selectBlock(node: TreeNode) {
  if (!props.editor) return;
  try {
    props.editor.chain().focus().setNodeSelection(node.pos).run();
  } catch {
    // If setNodeSelection fails, try setTextSelection
    props.editor.chain().focus().setTextSelection(node.pos).run();
  }
}

function toggleVisibility(node: TreeNode) {
  if (hiddenBlocks.value.has(node.key)) {
    hiddenBlocks.value.delete(node.key);
  } else {
    hiddenBlocks.value.add(node.key);
  }
  // Apply visibility via DOM (toggle opacity on the node)
  // This is a visual-only toggle for preview purposes
  node.hidden = hiddenBlocks.value.has(node.key);
}

function getIcon(type: string) {
  return blockIcons[type] || Box;
}

const selectedPos = computed(() => {
  if (!props.editor) return -1;
  return props.editor.state.selection.from;
});
</script>

<template>
  <div class="navigator-panel">
    <div class="navigator-header">
      <Layers :size="14" />
      <h4>Navigator</h4>
    </div>

    <div class="navigator-tree">
      <template v-if="treeData.length === 0">
        <div class="navigator-empty">No blocks yet</div>
      </template>

      <div v-for="node in treeData" :key="node.key" class="tree-root">
        <TreeItem
          :node="node"
          :expanded-keys="expandedKeys"
          :selected-pos="selectedPos"
          :get-icon="getIcon"
          @toggle-expand="toggleExpand"
          @select="selectBlock"
          @toggle-visibility="toggleVisibility"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, h, type PropType } from 'vue';

const TreeItem = defineComponent({
  name: 'TreeItem',
  props: {
    node: { type: Object as PropType<TreeNode>, required: true },
    expandedKeys: { type: Object as PropType<Set<string>>, required: true },
    selectedPos: { type: Number, required: true },
    getIcon: { type: Function, required: true },
  },
  emits: ['toggle-expand', 'select', 'toggle-visibility'],
  setup(props, { emit }) {
    return () => {
      const node = props.node;
      const isExpanded = props.expandedKeys.has(node.key);
      const hasChildren = node.children.length > 0;
      const isSelected = props.selectedPos >= node.pos && props.selectedPos <= node.pos + 10;
      const IconComp = props.getIcon(node.type);

      const chevron = hasChildren
        ? h('span', {
            class: 'tree-chevron',
            onClick: (e: Event) => { e.stopPropagation(); emit('toggle-expand', node.key); }
          }, [
            h(isExpanded ? ChevronDown : ChevronRight, { size: 12 })
          ])
        : h('span', { class: 'tree-chevron tree-chevron-empty' });

      const icon = h(IconComp, { size: 13, class: 'tree-icon' });

      const label = h('span', { class: 'tree-label' }, node.label);

      const eyeIcon = h('span', {
        class: 'tree-visibility',
        onClick: (e: Event) => { e.stopPropagation(); emit('toggle-visibility', node); }
      }, [
        h(node.hidden ? EyeOff : Eye, { size: 12 })
      ]);

      const row = h('div', {
        class: ['tree-row', { 'tree-row-selected': isSelected, 'tree-row-hidden': node.hidden }],
        style: { paddingLeft: `${node.depth * 16 + 8}px` },
        onClick: () => emit('select', node),
      }, [chevron, icon, label, eyeIcon]);

      const children = hasChildren && isExpanded
        ? node.children.map(child =>
            h(TreeItem, {
              node: child,
              expandedKeys: props.expandedKeys,
              selectedPos: props.selectedPos,
              getIcon: props.getIcon,
              'onToggle-expand': (key: string) => emit('toggle-expand', key),
              onSelect: (n: any) => emit('select', n),
              'onToggle-visibility': (n: any) => emit('toggle-visibility', n),
            })
          )
        : [];

      return h('div', { class: 'tree-node' }, [row, ...children]);
    };
  },
});
</script>

<style scoped>
.navigator-panel {
  width: 220px;
  border-right: 1px solid #e5e7eb;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.navigator-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 8px;
}
.navigator-header h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.navigator-tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.navigator-empty {
  padding: 24px 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
}

.tree-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
  color: #4b5563;
  border-radius: 4px;
  margin: 1px 4px;
  transition: background 0.1s;
}
.tree-row:hover {
  background: #e5e7eb;
}
.tree-row-selected {
  background: #dbeafe;
  color: #1d4ed8;
}
.tree-row-hidden {
  opacity: 0.4;
}
.tree-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: #9ca3af;
  cursor: pointer;
}
.tree-chevron-empty {
  cursor: default;
}
.tree-icon {
  flex-shrink: 0;
  color: #6b7280;
}
.tree-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.tree-visibility {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  opacity: 0;
  color: #9ca3af;
  transition: opacity 0.1s;
}
.tree-row:hover .tree-visibility {
  opacity: 1;
}
.tree-visibility:hover {
  color: #4b5563;
}
</style>
