<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Volume2, Music, Play } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') props.editor.commands.setNodeSelection(pos);
}
</script>

<template>
  <NodeViewWrapper class="audio-block-wrapper" :class="{ 'is-selected': selected }" data-type="audioBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><Volume2 :size="12" /> Audio</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="audio-preview" contenteditable="false" @click="selectThisNode">
      <div class="audio-player-mock">
        <div v-if="node.attrs.cover" class="audio-cover">
          <img :src="node.attrs.cover" alt="Cover art" />
        </div>
        <div v-else class="audio-cover-placeholder">
          <Music :size="24" />
        </div>
        <div class="audio-info">
          <div class="audio-title">{{ node.attrs.title || 'Untitled Audio' }}</div>
          <div v-if="node.attrs.artist" class="audio-artist">{{ node.attrs.artist }}</div>
          <div class="audio-progress">
            <div class="progress-bar"><div class="progress-fill"></div></div>
            <span class="progress-time">0:00 / --:--</span>
          </div>
        </div>
        <div class="audio-play-btn">
          <Play :size="18" />
        </div>
      </div>
      <div class="audio-meta">
        <span v-if="node.attrs.src" class="audio-meta-tag">Has source</span>
        <span v-else class="audio-meta-tag warn">No source</span>
        <span v-if="node.attrs.autoplay" class="audio-meta-tag">Autoplay</span>
        <span v-if="node.attrs.loop" class="audio-meta-tag">Loop</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.audio-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.audio-block-wrapper:hover { border-color: #d1d5db; }
.audio-block-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.audio-block-wrapper:hover .block-controls,
.audio-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }

.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.audio-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
}
.audio-player-mock {
  display: flex;
  align-items: center;
  gap: 14px;
}
.audio-cover {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}
.audio-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.audio-cover-placeholder {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  flex-shrink: 0;
}
.audio-info {
  flex: 1;
  min-width: 0;
}
.audio-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.audio-artist {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
}
.audio-progress {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.progress-bar {
  flex: 1;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
}
.progress-fill {
  width: 30%;
  height: 100%;
  background: #1677ff;
  border-radius: 2px;
}
.progress-time {
  font-size: 11px;
  color: #9ca3af;
  white-space: nowrap;
}
.audio-play-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #1677ff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.audio-meta {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e5e7eb;
}
.audio-meta-tag {
  font-size: 11px;
  color: #6b7280;
  background: #e5e7eb;
  padding: 2px 8px;
  border-radius: 4px;
}
.audio-meta-tag.warn {
  color: #d97706;
  background: #fef3c7;
}
</style>
