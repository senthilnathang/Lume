<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Crosshair, ImageIcon } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

interface Hotspot {
  x: number;
  y: number;
  title: string;
  description: string;
  link: string;
}

const parsedHotspots = computed<Hotspot[]>(() => {
  try {
    return JSON.parse(props.node.attrs.hotspots || '[]');
  } catch {
    return [];
  }
});

const hasImage = computed(() => !!props.node.attrs.image);

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper
    class="hotspot-block-wrapper"
    :class="{ 'is-selected': selected }"
    data-type="hotspotBlock"
  >
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><Crosshair :size="12" /> Hotspot Image</span>
      <span v-if="parsedHotspots.length" class="hotspot-count-badge">
        {{ parsedHotspots.length }} point{{ parsedHotspots.length !== 1 ? 's' : '' }}
      </span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>

    <div contenteditable="false" class="hotspot-preview" @click="selectThisNode">
      <template v-if="hasImage">
        <div class="hotspot-image-container">
          <img :src="node.attrs.image" alt="Hotspot image" class="hotspot-image" />
          <div
            v-for="(spot, i) in parsedHotspots"
            :key="i"
            class="hotspot-dot"
            :style="{ left: spot.x + '%', top: spot.y + '%' }"
            :title="spot.title"
          >
            <span class="dot-inner">{{ i + 1 }}</span>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="hotspot-placeholder">
          <ImageIcon :size="32" />
          <p>Select an image</p>
          <p class="placeholder-hint">Add an image and position interactive hotspots</p>
        </div>
      </template>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.hotspot-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.hotspot-block-wrapper:hover { border-color: #d1d5db; }
.hotspot-block-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.hotspot-block-wrapper:hover .block-controls,
.hotspot-block-wrapper.is-selected .block-controls {
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
.hotspot-count-badge {
  font-size: 11px; color: #059669; background: #ecfdf5; padding: 2px 8px;
  border-radius: 10px; user-select: none;
}
.block-delete {
  margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2;
  border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center;
}
.block-delete:hover { background: #fee2e2; }

.hotspot-image-container {
  position: relative;
  display: inline-block;
  width: 100%;
}
.hotspot-image {
  width: 100%;
  height: auto;
  border-radius: 4px;
  display: block;
}
.hotspot-dot {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.85);
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}
.dot-inner {
  color: white;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}
.hotspot-placeholder {
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #9ca3af;
}
.placeholder-hint {
  font-size: 12px;
  color: #c0c4cc;
  margin: 0;
}
</style>
