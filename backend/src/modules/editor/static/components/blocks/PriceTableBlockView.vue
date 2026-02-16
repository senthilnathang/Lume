<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, CreditCard, Check, X } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const features = computed(() => {
  const raw = props.node.attrs.features;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw) {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
});

const defaultFeatures = [
  { text: '10 Projects', included: true },
  { text: '5GB Storage', included: true },
  { text: 'Email Support', included: true },
  { text: 'Custom Domain', included: false },
  { text: 'Analytics', included: false },
];

const displayFeatures = computed(() => features.value.length > 0 ? features.value : defaultFeatures);

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="price-table-block-wrapper" :class="{ 'is-selected': selected }" data-type="priceTable">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><CreditCard :size="12" /> Price Table</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>
    <div contenteditable="false" class="price-preview" :class="{ highlighted: node.attrs.highlighted }" @click="selectThisNode">
      <div v-if="node.attrs.ribbonText" class="price-ribbon">{{ node.attrs.ribbonText }}</div>
      <div class="price-header">
        <h3 class="price-title">{{ node.attrs.title || 'Basic Plan' }}</h3>
        <div class="price-amount">
          <span class="price-value">{{ node.attrs.price || '$29' }}</span>
          <span class="price-period">{{ node.attrs.period || '/month' }}</span>
        </div>
      </div>
      <ul class="price-features">
        <li v-for="(feat, idx) in displayFeatures" :key="idx" class="price-feature" :class="{ excluded: !feat.included }">
          <Check v-if="feat.included" :size="16" class="feature-icon included" />
          <X v-else :size="16" class="feature-icon excluded" />
          <span>{{ feat.text }}</span>
        </li>
      </ul>
      <div class="price-cta">
        <span class="price-cta-btn" :class="{ highlighted: node.attrs.highlighted }">
          {{ node.attrs.ctaText || 'Get Started' }}
        </span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.price-table-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 8px;
  max-width: 340px;
}
.price-table-block-wrapper:hover { border-color: #d1d5db; }
.price-table-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.price-table-block-wrapper:hover .block-controls,
.price-table-block-wrapper.is-selected .block-controls {
  opacity: 1; pointer-events: all;
}
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.price-preview {
  position: relative;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 32px 24px;
  text-align: center;
  background: #fff;
  overflow: hidden;
}
.price-preview.highlighted {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}
.price-ribbon {
  position: absolute;
  top: 16px;
  right: -32px;
  background: #3b82f6;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 40px;
  transform: rotate(45deg);
}
.price-header {
  margin-bottom: 24px;
}
.price-title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}
.price-value {
  font-size: 40px;
  font-weight: 700;
  color: #111827;
}
.price-period {
  font-size: 14px;
  color: #6b7280;
}
.price-features {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  text-align: left;
}
.price-feature {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 14px;
  color: #374151;
}
.price-feature.excluded {
  color: #9ca3af;
}
.feature-icon.included { color: #10b981; }
.feature-icon.excluded { color: #d1d5db; }
.price-cta-btn {
  display: inline-block;
  padding: 12px 32px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  background: #f3f4f6;
  color: #374151;
  cursor: default;
}
.price-cta-btn.highlighted {
  background: #3b82f6;
  color: #fff;
}
</style>
