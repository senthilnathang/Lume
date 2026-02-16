<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, LayoutGrid } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const count = computed(() => props.node.attrs.count || 6);
const columns = computed(() => props.node.attrs.columns || 3);
const pageType = computed(() => props.node.attrs.pageType || 'all');
const showExcerpt = computed(() => props.node.attrs.showExcerpt !== false);
const showImage = computed(() => props.node.attrs.showImage !== false);
const showDate = computed(() => props.node.attrs.showDate !== false);
const orderBy = computed(() => props.node.attrs.orderBy || 'newest');

const placeholderItems = computed(() => {
  return Array.from({ length: Math.min(count.value, 6) }, (_, i) => i + 1);
});

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="posts-grid-block-wrapper" :class="{ 'is-selected': selected }" data-type="postsGrid">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><LayoutGrid :size="12" /> Posts Grid</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="posts-grid-preview" contenteditable="false" @click="selectThisNode">
      <div class="posts-grid-config">
        Showing {{ count }} {{ pageType === 'all' ? '' : pageType + ' ' }}posts in {{ columns }} columns, ordered by {{ orderBy }}
      </div>
      <div class="posts-grid" :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }">
        <div v-for="n in placeholderItems" :key="n" class="post-card-placeholder">
          <div v-if="showImage" class="post-card-image"></div>
          <div class="post-card-body">
            <div v-if="showDate" class="post-card-date"></div>
            <div class="post-card-title"></div>
            <div v-if="showExcerpt" class="post-card-excerpt">
              <div class="excerpt-line"></div>
              <div class="excerpt-line short"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.posts-grid-block-wrapper { position: relative; border: 2px dashed transparent; border-radius: 4px; transition: border-color 0.15s; margin: 8px 0; padding: 8px; }
.posts-grid-block-wrapper:hover { border-color: #d1d5db; }
.posts-grid-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls { position: absolute; top: -1px; left: -1px; right: -1px; display: flex; align-items: center; gap: 4px; opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none; }
.posts-grid-block-wrapper:hover .block-controls, .posts-grid-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.posts-grid-preview { padding: 12px; }
.posts-grid-config { font-size: 12px; color: #6b7280; background: #f3f4f6; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; text-align: center; }
.posts-grid { display: grid; gap: 16px; }
.post-card-placeholder { background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
.post-card-image { height: 100px; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); }
.post-card-body { padding: 12px; }
.post-card-date { width: 60px; height: 8px; background: #e5e7eb; border-radius: 4px; margin-bottom: 8px; }
.post-card-title { width: 80%; height: 12px; background: #d1d5db; border-radius: 4px; margin-bottom: 8px; }
.post-card-excerpt { display: flex; flex-direction: column; gap: 4px; }
.excerpt-line { height: 8px; background: #e5e7eb; border-radius: 4px; }
.excerpt-line.short { width: 60%; }
</style>
