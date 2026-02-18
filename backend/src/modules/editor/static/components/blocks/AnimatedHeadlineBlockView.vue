<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Type } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const parsedTexts = computed<string[]>(() => {
  try {
    return JSON.parse(props.node.attrs.rotatingTexts || '[]');
  } catch {
    return [];
  }
});

const firstText = computed(() => parsedTexts.value[0] || 'Text');

const effectLabel = computed(() => {
  const map: Record<string, string> = {
    typing: 'Typing',
    fade: 'Fade',
    slide: 'Slide',
    clip: 'Clip',
    rotate: 'Rotate',
  };
  return map[props.node.attrs.effect] || 'Typing';
});

const wrapperStyles = computed(() => ({
  textAlign: props.node.attrs.alignment || 'center',
}));

const headingTag = computed(() => props.node.attrs.tag || 'h2');

const accentColor = computed(() => props.node.attrs.color || '#3b82f6');

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper
    class="animated-headline-wrapper"
    :class="{ 'is-selected': selected }"
    data-type="animatedHeadline"
  >
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><Type :size="12" /> Animated Headline</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>

    <div contenteditable="false" class="headline-preview" :style="wrapperStyles" @click="selectThisNode">
      <component :is="headingTag" class="preview-heading">
        <span v-if="node.attrs.beforeText" class="before-text">{{ node.attrs.beforeText }} </span>
        <span class="rotating-text" :style="{ color: accentColor }">{{ firstText }}</span>
        <span v-if="node.attrs.afterText" class="after-text"> {{ node.attrs.afterText }}</span>
      </component>
      <div class="headline-badges">
        <span class="effect-badge">{{ effectLabel }}</span>
        <span class="count-badge">{{ parsedTexts.length }} text{{ parsedTexts.length !== 1 ? 's' : '' }}</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.animated-headline-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 8px;
}
.animated-headline-wrapper:hover { border-color: #d1d5db; }
.animated-headline-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.animated-headline-wrapper:hover .block-controls,
.animated-headline-wrapper.is-selected .block-controls {
  opacity: 1; pointer-events: all;
}
.block-drag-handle {
  cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px;
  display: flex; align-items: center; color: #6b7280;
}
.block-drag-handle:hover { background: #e5e7eb; }
.block-label {
  font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px;
  border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none;
}
.block-delete {
  margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2;
  border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center;
}
.block-delete:hover { background: #fee2e2; }

.headline-preview {
  padding: 16px 12px;
  cursor: pointer;
}
.preview-heading {
  margin: 0 0 8px 0;
  line-height: 1.3;
}
.rotating-text {
  font-weight: 700;
  border-bottom: 2px solid currentColor;
  padding-bottom: 2px;
}
.headline-badges {
  display: flex;
  gap: 6px;
  justify-content: center;
  margin-top: 8px;
}
.effect-badge,
.count-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  user-select: none;
}
.effect-badge {
  background: #eff6ff;
  color: #3b82f6;
}
.count-badge {
  background: #f3f4f6;
  color: #6b7280;
}
</style>
