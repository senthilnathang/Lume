<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Presentation, ImageIcon } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

interface Slide {
  bgImage: string;
  heading: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
}

const slides = computed<Slide[]>(() => {
  try {
    const parsed = JSON.parse(props.node.attrs.slides || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
});

const firstSlide = computed(() => slides.value[0] || null);

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') props.editor.commands.setNodeSelection(pos);
}
</script>

<template>
  <NodeViewWrapper class="slides-block-wrapper" :class="{ 'is-selected': selected }" data-type="slidesBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><Presentation :size="12" /> Hero Slides</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="slides-preview" contenteditable="false" @click="selectThisNode">
      <div v-if="firstSlide" class="slide-hero-mock" :style="firstSlide.bgImage ? { backgroundImage: `url(${firstSlide.bgImage})` } : {}">
        <div class="slide-overlay" :style="{ background: node.attrs.overlayColor }">
          <h3 v-if="firstSlide.heading" class="slide-heading">{{ firstSlide.heading }}</h3>
          <p v-if="firstSlide.description" class="slide-desc">{{ firstSlide.description }}</p>
          <span v-if="firstSlide.buttonText" class="slide-cta">{{ firstSlide.buttonText }}</span>
        </div>
      </div>
      <div v-else class="slides-empty">
        <Presentation :size="36" />
        <span>Add slides in settings</span>
      </div>
      <div class="slides-meta">
        <span class="slides-meta-tag">{{ slides.length }} {{ slides.length === 1 ? 'slide' : 'slides' }}</span>
        <span class="slides-meta-tag">{{ node.attrs.effect }}</span>
        <span class="slides-meta-tag">{{ node.attrs.height }}px</span>
        <span v-if="node.attrs.autoplay" class="slides-meta-tag">{{ node.attrs.interval }}ms</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.slides-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.slides-block-wrapper:hover { border-color: #d1d5db; }
.slides-block-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.slides-block-wrapper:hover .block-controls,
.slides-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }

.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.slides-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}
.slide-hero-mock {
  height: 180px;
  background: #1e293b;
  background-size: cover;
  background-position: center;
  position: relative;
}
.slide-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
}
.slide-heading {
  color: white;
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 8px;
}
.slide-desc {
  color: rgba(255,255,255,0.85);
  font-size: 14px;
  margin: 0 0 12px;
}
.slide-cta {
  display: inline-block;
  padding: 6px 20px;
  background: #1677ff;
  color: white;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}
.slides-empty {
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #9ca3af;
}
.slides-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 16px;
}
.slides-meta-tag {
  font-size: 11px;
  color: #6b7280;
  background: #e5e7eb;
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
