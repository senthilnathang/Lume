<script setup lang="ts">
import { computed, ref } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Video, Play } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);
const showUrlInput = ref(false);
const urlInput = ref(props.node.attrs.src || '');

const embedUrl = computed(() => {
  const src = props.node.attrs.src || '';
  // YouTube
  const ytMatch = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = src.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return src;
});

const aspectClass = computed(() => {
  const r = props.node.attrs.aspectRatio || '16:9';
  if (r === '4:3') return 'aspect-4-3';
  if (r === '1:1') return 'aspect-1-1';
  return 'aspect-16-9';
});

function updateSrc() {
  props.updateAttributes({ src: urlInput.value });
  showUrlInput.value = false;
}
</script>

<template>
  <NodeViewWrapper class="video-block-wrapper" :class="{ 'is-selected': selected }" data-type="videoBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><Video :size="12" /> Video</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>
    <div v-if="embedUrl && node.attrs.src" :class="['video-container', aspectClass]" contenteditable="false">
      <iframe :src="embedUrl" frameborder="0" allowfullscreen />
    </div>
    <div v-else class="video-placeholder" contenteditable="false">
      <div v-if="!showUrlInput" class="placeholder-content" @click="showUrlInput = true">
        <Play :size="32" />
        <p>Click to add a video URL (YouTube or Vimeo)</p>
      </div>
      <div v-else class="url-input-wrapper">
        <input v-model="urlInput" type="text" placeholder="Paste YouTube or Vimeo URL..." class="url-input" @keydown.enter="updateSrc" />
        <button class="url-submit" @click="updateSrc">Add</button>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.video-block-wrapper {
  position: relative; border: 2px dashed transparent; border-radius: 4px;
  transition: border-color 0.15s; margin: 8px 0;
}
.video-block-wrapper:hover { border-color: #d1d5db; }
.video-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.video-block-wrapper:hover .block-controls,
.video-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }
.video-container { position: relative; width: 100%; overflow: hidden; border-radius: 8px; }
.video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.aspect-16-9 { padding-bottom: 56.25%; }
.aspect-4-3 { padding-bottom: 75%; }
.aspect-1-1 { padding-bottom: 100%; }
.video-placeholder { background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 8px; padding: 40px 20px; text-align: center; cursor: pointer; }
.placeholder-content { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #9ca3af; }
.url-input-wrapper { display: flex; gap: 8px; max-width: 400px; margin: 0 auto; }
.url-input { flex: 1; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; outline: none; font-size: 14px; }
.url-input:focus { border-color: #1677ff; }
.url-submit { padding: 8px 16px; background: #1677ff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
.url-submit:hover { background: #0958d9; }
</style>
