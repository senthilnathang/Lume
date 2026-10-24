<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, MapPin } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const lat = computed(() => props.node.attrs.lat ?? 37.7749);
const lng = computed(() => props.node.attrs.lng ?? -122.4194);
const zoom = computed(() => props.node.attrs.zoom ?? 12);
const height = computed(() => props.node.attrs.height ?? 400);
const markerTitle = computed(() => props.node.attrs.markerTitle || '');
const mapStyle = computed(() => props.node.attrs.style || 'roadmap');

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="google-map-block-wrapper" :class="{ 'is-selected': selected }" data-type="googleMap">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><MapPin :size="12" /> Google Map</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="map-preview" contenteditable="false" :style="{ height: height + 'px' }" @click="selectThisNode">
      <div class="map-placeholder">
        <MapPin :size="40" class="map-icon" />
        <div class="map-info">
          <div class="map-coords">{{ lat.toFixed(4) }}, {{ lng.toFixed(4) }}</div>
          <div v-if="markerTitle" class="map-marker-title">{{ markerTitle }}</div>
          <div class="map-meta">
            <span>Zoom: {{ zoom }}</span>
            <span class="map-meta-sep">|</span>
            <span>Style: {{ mapStyle }}</span>
            <span class="map-meta-sep">|</span>
            <span>{{ height }}px</span>
          </div>
        </div>
        <div class="map-note">Map renders on published page</div>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.google-map-block-wrapper { position: relative; border: 2px dashed transparent; border-radius: 4px; transition: border-color 0.15s; margin: 8px 0; padding: 8px; }
.google-map-block-wrapper:hover { border-color: #d1d5db; }
.google-map-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls { position: absolute; top: -1px; left: -1px; right: -1px; display: flex; align-items: center; gap: 4px; opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none; }
.google-map-block-wrapper:hover .block-controls, .google-map-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.map-preview { border-radius: 8px; overflow: hidden; min-height: 200px; max-height: 600px; }
.map-placeholder { width: 100%; height: 100%; background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 50%, #c7d2fe 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
.map-icon { color: #ef4444; }
.map-info { text-align: center; }
.map-coords { font-size: 18px; font-weight: 600; color: #1e40af; font-family: monospace; }
.map-marker-title { font-size: 14px; color: #374151; margin-top: 4px; font-weight: 500; }
.map-meta { margin-top: 8px; font-size: 12px; color: #6b7280; display: flex; gap: 4px; }
.map-meta-sep { color: #d1d5db; }
.map-note { font-size: 11px; color: #9ca3af; font-style: italic; }
</style>
