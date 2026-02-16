<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Quote, Star, User } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const ratingStars = computed(() => {
  const r = Math.min(Math.max(props.node.attrs.rating || 0, 0), 5);
  return Array.from({ length: 5 }, (_, i) => i < r);
});

const initials = computed(() => {
  const name = props.node.attrs.authorName || 'Jane Smith';
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
});

const styleClass = computed(() => `testimonial-${props.node.attrs.style || 'card'}`);

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="testimonial-block-wrapper" :class="{ 'is-selected': selected }" data-type="testimonial">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><Quote :size="12" /> Testimonial</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>
    <div contenteditable="false" class="testimonial-preview" :class="styleClass" @click="selectThisNode">
      <div class="testimonial-rating">
        <Star
          v-for="(filled, idx) in ratingStars"
          :key="idx"
          :size="16"
          :class="{ 'star-filled': filled, 'star-empty': !filled }"
        />
      </div>
      <blockquote class="testimonial-quote">
        "{{ node.attrs.quote || 'This is an amazing product!' }}"
      </blockquote>
      <div class="testimonial-author">
        <div class="author-avatar">
          <img v-if="node.attrs.authorImage" :src="node.attrs.authorImage" :alt="node.attrs.authorName" class="author-image" />
          <div v-else class="author-initials">{{ initials }}</div>
        </div>
        <div class="author-info">
          <span class="author-name">{{ node.attrs.authorName || 'Jane Smith' }}</span>
          <span class="author-role">{{ node.attrs.authorRole || 'CEO, Company' }}</span>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.testimonial-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 8px;
}
.testimonial-block-wrapper:hover { border-color: #d1d5db; }
.testimonial-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.testimonial-block-wrapper:hover .block-controls,
.testimonial-block-wrapper.is-selected .block-controls {
  opacity: 1; pointer-events: all;
}
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.testimonial-preview {
  padding: 24px;
  border-radius: 12px;
}
.testimonial-card {
  background: #fff;
  border: 1px solid #e5e7eb;
}
.testimonial-minimal {
  background: transparent;
  border: none;
  padding-left: 20px;
  border-left: 3px solid #3b82f6;
}
.testimonial-bubble {
  background: #f0f9ff;
  border: 1px solid #bfdbfe;
  position: relative;
}
.testimonial-rating {
  display: flex;
  gap: 2px;
  margin-bottom: 12px;
}
.star-filled { color: #f59e0b; fill: #f59e0b; }
.star-empty { color: #d1d5db; }
.testimonial-quote {
  margin: 0 0 20px;
  font-size: 15px;
  line-height: 1.6;
  color: #374151;
  font-style: italic;
}
.testimonial-author {
  display: flex;
  align-items: center;
  gap: 12px;
}
.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}
.author-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.author-initials {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dbeafe;
  color: #3b82f6;
  font-size: 14px;
  font-weight: 600;
}
.author-info {
  display: flex;
  flex-direction: column;
}
.author-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}
.author-role {
  font-size: 12px;
  color: #6b7280;
}
</style>
