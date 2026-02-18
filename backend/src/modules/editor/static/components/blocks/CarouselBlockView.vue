<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, SlidersHorizontal, ImageIcon } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

interface Slide {
  image: string;
  title: string;
  description: string;
  link: string;
}

const slides = computed<Slide[]>(() => {
  try {
    const parsed = JSON.parse(props.node.attrs.slides || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
});

const firstSlideImage = computed(() => {
  if (slides.value.length > 0 && slides.value[0].image) {
    return slides.value[0].image;
  }
  return '';
});

const effectLabel = computed(() => {
  const effects: Record<string, string> = { slide: 'Slide', fade: 'Fade', cube: 'Cube' };
  return effects[props.node.attrs.effect] || 'Slide';
});

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="carousel-block-wrapper" :class="{ 'is-selected': selected }" data-type="carouselBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><SlidersHorizontal :size="12" /> Carousel</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>

    <div class="carousel-preview" contenteditable="false" @click="selectThisNode">
      <div v-if="firstSlideImage" class="carousel-thumb">
        <img :src="firstSlideImage" alt="First slide preview" />
        <div class="carousel-thumb-overlay">
          <SlidersHorizontal :size="24" />
        </div>
      </div>
      <div v-else class="carousel-placeholder-icon">
        <ImageIcon :size="36" />
      </div>

      <div class="carousel-info">
        <div class="carousel-slide-count">
          {{ slides.length }} {{ slides.length === 1 ? 'slide' : 'slides' }}
        </div>
        <div class="carousel-meta">
          <span class="carousel-meta-tag">{{ effectLabel }}</span>
          <span v-if="node.attrs.autoplay" class="carousel-meta-tag">Autoplay {{ node.attrs.interval }}ms</span>
          <span v-if="node.attrs.loop" class="carousel-meta-tag">Loop</span>
          <span v-if="node.attrs.navigation" class="carousel-meta-tag">Nav</span>
          <span v-if="node.attrs.pagination" class="carousel-meta-tag">Dots</span>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.carousel-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.carousel-block-wrapper:hover { border-color: #d1d5db; }
.carousel-block-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.carousel-block-wrapper:hover .block-controls,
.carousel-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }

.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.carousel-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  min-height: 100px;
}

.carousel-thumb {
  position: relative;
  width: 120px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}
.carousel-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.carousel-thumb-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: opacity 0.15s;
}
.carousel-thumb:hover .carousel-thumb-overlay { opacity: 1; }

.carousel-placeholder-icon {
  width: 120px;
  height: 80px;
  background: #e5e7eb;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  flex-shrink: 0;
}

.carousel-info {
  flex: 1;
  min-width: 0;
}
.carousel-slide-count {
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}
.carousel-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.carousel-meta-tag {
  font-size: 11px;
  color: #6b7280;
  background: #e5e7eb;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}
</style>
