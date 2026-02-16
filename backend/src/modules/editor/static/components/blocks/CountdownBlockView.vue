<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Timer } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const hasDate = computed(() => !!props.node.attrs.targetDate);
const showLabels = computed(() => props.node.attrs.showLabels !== false);
const styleVariant = computed(() => props.node.attrs.style || 'simple');

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="countdown-block-wrapper" :class="{ 'is-selected': selected }" data-type="countdown">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><Timer :size="12" /> Countdown</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="countdown-preview" contenteditable="false" @click="selectThisNode">
      <div v-if="!hasDate" class="countdown-placeholder">
        <Timer :size="24" class="placeholder-icon" />
        <span>Set target date in settings</span>
      </div>
      <div v-else class="countdown-display" :class="`countdown-${styleVariant}`">
        <div class="countdown-unit">
          <div class="countdown-value">00</div>
          <div v-if="showLabels" class="countdown-label">Days</div>
        </div>
        <span class="countdown-separator">:</span>
        <div class="countdown-unit">
          <div class="countdown-value">00</div>
          <div v-if="showLabels" class="countdown-label">Hours</div>
        </div>
        <span class="countdown-separator">:</span>
        <div class="countdown-unit">
          <div class="countdown-value">00</div>
          <div v-if="showLabels" class="countdown-label">Minutes</div>
        </div>
        <span class="countdown-separator">:</span>
        <div class="countdown-unit">
          <div class="countdown-value">00</div>
          <div v-if="showLabels" class="countdown-label">Seconds</div>
        </div>
      </div>
      <div v-if="hasDate" class="countdown-target-info">
        Target: {{ node.attrs.targetDate }}
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.countdown-block-wrapper { position: relative; border: 2px dashed transparent; border-radius: 4px; transition: border-color 0.15s; margin: 8px 0; padding: 8px; }
.countdown-block-wrapper:hover { border-color: #d1d5db; }
.countdown-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls { position: absolute; top: -1px; left: -1px; right: -1px; display: flex; align-items: center; gap: 4px; opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none; }
.countdown-block-wrapper:hover .block-controls, .countdown-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.countdown-preview { text-align: center; padding: 24px 16px; }
.countdown-placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #9ca3af; font-size: 14px; padding: 20px; }
.placeholder-icon { color: #d1d5db; }
.countdown-display { display: flex; align-items: flex-start; justify-content: center; gap: 8px; }
.countdown-unit { text-align: center; }
.countdown-value { font-size: 36px; font-weight: 700; color: #111827; background: #f3f4f6; border-radius: 8px; padding: 12px 20px; min-width: 70px; line-height: 1; }
.countdown-label { font-size: 12px; color: #6b7280; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
.countdown-separator { font-size: 32px; font-weight: 700; color: #9ca3af; padding-top: 10px; }
.countdown-target-info { margin-top: 12px; font-size: 12px; color: #9ca3af; }
.countdown-simple .countdown-value { background: #f3f4f6; }
</style>
