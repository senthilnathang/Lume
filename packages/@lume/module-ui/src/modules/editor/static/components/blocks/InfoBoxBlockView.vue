<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Info, AlertCircle, CheckCircle, Star, Zap, Heart, Shield } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const iconMap: Record<string, any> = {
  info: Info,
  alert: AlertCircle,
  check: CheckCircle,
  star: Star,
  zap: Zap,
  heart: Heart,
  shield: Shield,
};

const iconComponent = computed(() => iconMap[props.node.attrs.icon] || Info);

const containerStyles = computed(() => {
  const pos = props.node.attrs.iconPosition || 'top';
  return {
    flexDirection: pos === 'top' ? 'column' : (pos === 'right' ? 'row-reverse' : 'row'),
    alignItems: pos === 'top' ? 'center' : 'flex-start',
    textAlign: pos === 'top' ? 'center' : 'left',
  } as Record<string, string>;
});

const iconCircleStyles = computed(() => ({
  backgroundColor: props.node.attrs.iconBgColor || '#dbeafe',
  color: props.node.attrs.iconColor || '#3b82f6',
}));

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="info-box-block-wrapper" :class="{ 'is-selected': selected }" data-type="infoBox">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><Info :size="12" /> Info Box</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>
    <div contenteditable="false" class="info-box-preview" :style="containerStyles" @click="selectThisNode">
      <div class="info-box-icon" :style="iconCircleStyles">
        <component :is="iconComponent" :size="24" />
      </div>
      <div class="info-box-content">
        <h4 class="info-box-title">{{ node.attrs.title || 'Info Box Title' }}</h4>
        <p class="info-box-description">{{ node.attrs.description || 'Your description here' }}</p>
        <a v-if="node.attrs.linkUrl" class="info-box-link" href="#">{{ node.attrs.linkText || 'Learn More' }}</a>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.info-box-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 8px;
}
.info-box-block-wrapper:hover { border-color: #d1d5db; }
.info-box-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.info-box-block-wrapper:hover .block-controls,
.info-box-block-wrapper.is-selected .block-controls {
  opacity: 1; pointer-events: all;
}
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.info-box-preview {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.info-box-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.info-box-content {
  flex: 1;
  min-width: 0;
}
.info-box-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}
.info-box-description {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}
.info-box-link {
  font-size: 14px;
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}
</style>
