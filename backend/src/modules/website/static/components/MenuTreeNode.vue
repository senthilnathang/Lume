<script setup lang="ts">
import { GripVertical, Edit, Trash2, ExternalLink, FileText, ChevronRight } from 'lucide-vue-next';
import draggable from 'vuedraggable';

defineOptions({ name: 'MenuTreeNode' });

const props = defineProps<{
  item: any;
  depth?: number;
}>();

const emit = defineEmits(['edit', 'delete', 'change']);
</script>

<template>
  <div class="menu-tree-node">
    <div
      class="node-row"
      :class="{ 'is-child': (depth || 0) > 0 }"
    >
      <GripVertical :size="15" class="drag-handle" />
      <ChevronRight v-if="item.children?.length" :size="14" class="text-gray-400" />
      <span class="node-label">{{ item.label }}</span>
      <span v-if="item.description" class="node-desc">{{ item.description }}</span>
      <a-tag v-if="item.pageId" color="blue" size="small">Page</a-tag>
      <a-tag v-else color="default" size="small">
        <template #icon><ExternalLink :size="10" /></template>
        Link
      </a-tag>
      <span v-if="item.url" class="node-url">{{ item.url }}</span>
      <div class="node-actions">
        <a-tooltip title="Edit">
          <a-button type="text" size="small" @click.stop="emit('edit', item)">
            <template #icon><Edit :size="14" /></template>
          </a-button>
        </a-tooltip>
        <a-popconfirm
          title="Delete this item and its children?"
          ok-text="Delete"
          ok-type="danger"
          @confirm="emit('delete', item)"
        >
          <a-tooltip title="Delete">
            <a-button type="text" size="small" danger @click.stop>
              <template #icon><Trash2 :size="14" /></template>
            </a-button>
          </a-tooltip>
        </a-popconfirm>
      </div>
    </div>
    <!-- Nested children -->
    <draggable
      :list="item.children"
      :group="{ name: 'menu-items' }"
      item-key="id"
      class="node-children"
      ghost-class="drag-ghost"
      handle=".drag-handle"
      @change="emit('change')"
    >
      <template #item="{ element }">
        <MenuTreeNode
          :item="element"
          :depth="(depth || 0) + 1"
          @edit="(i: any) => emit('edit', i)"
          @delete="(i: any) => emit('delete', i)"
          @change="emit('change')"
        />
      </template>
    </draggable>
  </div>
</template>

<style scoped>
.menu-tree-node {
  /* Wrapper for each tree node + its children */
}

.node-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  margin-bottom: 4px;
  transition: all 0.15s;
  min-height: 40px;
}

.node-row:hover {
  border-color: #bfdbfe;
  background: #f8fafc;
}

.node-row.is-child {
  background: #fafbfc;
  border-color: #e5e7eb;
}

.drag-handle {
  color: #9ca3af;
  cursor: grab;
  flex-shrink: 0;
}

.drag-handle:active {
  cursor: grabbing;
}

.node-label {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  flex-shrink: 0;
}

.node-desc {
  font-size: 11px;
  color: #9ca3af;
  flex-shrink: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.node-url {
  font-size: 11px;
  color: #6b7280;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.node-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  flex-shrink: 0;
  opacity: 0.4;
  transition: opacity 0.15s;
}

.node-row:hover .node-actions {
  opacity: 1;
}

.node-children {
  padding-left: 24px;
  min-height: 4px;
}

.drag-ghost {
  opacity: 0.3;
  background: #eff6ff;
  border-color: #93c5fd;
}
</style>
