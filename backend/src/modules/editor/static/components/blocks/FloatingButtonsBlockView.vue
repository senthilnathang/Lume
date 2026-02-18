<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, MessageCircle, Phone, Mail } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

interface FloatingBtn {
  type: string;
  label: string;
  url: string;
  icon: string;
  color: string;
}

const buttons = computed<FloatingBtn[]>(() => {
  try {
    const parsed = JSON.parse(props.node.attrs.buttons || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
});

const typeColors: Record<string, string> = {
  whatsapp: '#25d366',
  phone: '#1677ff',
  email: '#ef4444',
  messenger: '#0084ff',
  custom: '#6b7280',
};

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') props.editor.commands.setNodeSelection(pos);
}
</script>

<template>
  <NodeViewWrapper class="floating-buttons-block-wrapper" :class="{ 'is-selected': selected }" data-type="floatingButtonsBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><MessageCircle :size="12" /> Floating Buttons</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="floating-buttons-preview" contenteditable="false" @click="selectThisNode">
      <div class="fab-mock" :class="node.attrs.position">
        <div
          v-for="(btn, i) in buttons"
          :key="i"
          class="fab-btn"
          :class="node.attrs.style"
          :style="{ backgroundColor: btn.color || typeColors[btn.type] || '#6b7280' }"
        >
          <MessageCircle v-if="btn.type === 'whatsapp' || btn.type === 'messenger'" :size="16" />
          <Phone v-else-if="btn.type === 'phone'" :size="16" />
          <Mail v-else-if="btn.type === 'email'" :size="16" />
          <MessageCircle v-else :size="16" />
          <span v-if="node.attrs.showLabels" class="fab-label">{{ btn.label }}</span>
        </div>
      </div>
      <div class="fab-meta">
        <span class="fab-meta-tag">{{ buttons.length }} buttons</span>
        <span class="fab-meta-tag">{{ node.attrs.position }}</span>
        <span class="fab-meta-tag">{{ node.attrs.style }}</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.floating-buttons-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.floating-buttons-block-wrapper:hover { border-color: #d1d5db; }
.floating-buttons-block-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.floating-buttons-block-wrapper:hover .block-controls,
.floating-buttons-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }

.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.floating-buttons-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
}
.fab-mock {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
.fab-mock.bottom-left { justify-content: flex-start; }
.fab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  color: white;
  padding: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.fab-btn.circle {
  border-radius: 50%;
  width: 40px;
  height: 40px;
  justify-content: center;
  padding: 0;
}
.fab-btn.pill {
  border-radius: 24px;
  padding: 8px 16px;
}
.fab-label {
  font-size: 12px;
  font-weight: 500;
}
.fab-meta {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e5e7eb;
}
.fab-meta-tag {
  font-size: 11px;
  color: #6b7280;
  background: #e5e7eb;
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
