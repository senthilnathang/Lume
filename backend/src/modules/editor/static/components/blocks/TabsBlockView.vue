<script setup lang="ts">
import { computed, ref } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, LayoutList } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

interface Tab {
  title: string;
  content: string;
}

const tabs = computed<Tab[]>(() => {
  try {
    const parsed = JSON.parse(props.node.attrs.tabs || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
});

const activeTab = ref(props.node.attrs.defaultActive || 0);

const styleLabel = computed(() => {
  const styles: Record<string, string> = { default: 'Default', pills: 'Pills', underline: 'Underline' };
  return styles[props.node.attrs.style] || 'Default';
});

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') props.editor.commands.setNodeSelection(pos);
}
</script>

<template>
  <NodeViewWrapper class="tabs-block-wrapper" :class="{ 'is-selected': selected }" data-type="tabsBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><LayoutList :size="12" /> Tabs</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="tabs-preview" contenteditable="false" @click="selectThisNode">
      <div class="tabs-header">
        <button
          v-for="(tab, i) in tabs"
          :key="i"
          :class="['tab-btn', { active: activeTab === i }]"
          @click.stop="activeTab = i"
        >
          {{ tab.title || `Tab ${i + 1}` }}
        </button>
      </div>
      <div v-if="tabs[activeTab]" class="tab-content-preview">
        {{ tabs[activeTab].content || 'No content' }}
      </div>
      <div v-else class="tab-empty">
        <LayoutList :size="24" />
        <span>Add tabs in settings</span>
      </div>
      <div class="tabs-meta">
        <span class="tabs-meta-tag">{{ tabs.length }} tabs</span>
        <span class="tabs-meta-tag">{{ styleLabel }}</span>
        <span class="tabs-meta-tag">{{ node.attrs.position }}</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.tabs-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.tabs-block-wrapper:hover { border-color: #d1d5db; }
.tabs-block-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.tabs-block-wrapper:hover .block-controls,
.tabs-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }

.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.tabs-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
}
.tabs-header {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0;
}
.tab-btn {
  padding: 6px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.15s;
}
.tab-btn.active {
  color: #1677ff;
  border-bottom-color: #1677ff;
}
.tab-content-preview {
  font-size: 13px;
  color: #4b5563;
  padding: 8px 4px;
  min-height: 40px;
}
.tab-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9ca3af;
  padding: 16px;
  justify-content: center;
}
.tabs-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}
.tabs-meta-tag {
  font-size: 11px;
  color: #6b7280;
  background: #e5e7eb;
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
