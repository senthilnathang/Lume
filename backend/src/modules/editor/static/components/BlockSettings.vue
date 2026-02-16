<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { Settings2 } from 'lucide-vue-next';
import { getWidget, widgetRegistry } from '../widgets/registry';
import SettingsRenderer from '../widgets/SettingsRenderer.vue';

const props = defineProps<{
  editor: any;
}>();

const activeBlock = ref<string | null>(null);
const blockAttrs = ref<Record<string, any>>({});

// All widget types we manage settings for
const managedBlocks = computed(() => new Set(widgetRegistry.map(w => w.type)));

// Find the closest (deepest) managed block at the current selection
function updateFromSelection() {
  if (!props.editor) return;
  const sel = props.editor.state.selection;
  const managed = managedBlocks.value;

  // NodeSelection (atom blocks like priceTable, countdown, etc.)
  if (sel.node) {
    const nodeName = sel.node.type.name;
    if (managed.has(nodeName)) {
      activeBlock.value = nodeName;
      blockAttrs.value = { ...sel.node.attrs };
      return;
    }
  }

  // Text selection — walk from deepest node to root
  const { $from } = sel;
  for (let d = $from.depth; d >= 0; d--) {
    const nodeName = $from.node(d).type.name;
    if (managed.has(nodeName)) {
      activeBlock.value = nodeName;
      blockAttrs.value = { ...props.editor.getAttributes(nodeName) };
      return;
    }
  }

  activeBlock.value = null;
  blockAttrs.value = {};
}

// Use TipTap's event system — fires on every transaction
let boundEditor: any = null;

function bindEditor(ed: any) {
  if (boundEditor) {
    boundEditor.off('selectionUpdate', updateFromSelection);
    boundEditor.off('transaction', updateFromSelection);
  }
  boundEditor = ed;
  if (ed) {
    ed.on('selectionUpdate', updateFromSelection);
    ed.on('transaction', updateFromSelection);
  }
}

watch(() => props.editor, (ed) => {
  if (ed) bindEditor(ed);
}, { immediate: true });

onBeforeUnmount(() => {
  if (boundEditor) {
    boundEditor.off('selectionUpdate', updateFromSelection);
    boundEditor.off('transaction', updateFromSelection);
  }
});

const activeWidget = computed(() => {
  if (!activeBlock.value) return null;
  return getWidget(activeBlock.value) || null;
});

function handleUpdate(key: string, value: any) {
  if (!props.editor || !activeBlock.value) return;
  props.editor.chain().focus().updateAttributes(activeBlock.value, { [key]: value }).run();
  blockAttrs.value[key] = value;
}
</script>

<template>
  <div class="block-settings">
    <div class="settings-header">
      <Settings2 :size="14" />
      <h4>{{ activeWidget?.name || 'Block' }} Settings</h4>
    </div>

    <div v-if="!activeBlock" class="settings-empty">
      <p>Select a block to edit its settings</p>
    </div>

    <div v-else-if="activeWidget" class="settings-content">
      <SettingsRenderer
        :attributes="activeWidget.attributes"
        :values="blockAttrs"
        @update="handleUpdate"
      />
    </div>
  </div>
</template>

<style scoped>
.block-settings {
  width: 260px;
  border-left: 1px solid #e5e7eb;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.settings-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 8px;
}
.settings-header h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.settings-empty {
  padding: 32px 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
}
.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}
</style>
