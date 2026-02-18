<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { Settings2, Bookmark, FolderOpen, Wand2 } from 'lucide-vue-next';
import { getWidget, widgetRegistry } from '../widgets/registry';
import SettingsRenderer from '../widgets/SettingsRenderer.vue';
import PresetPicker from './PresetPicker.vue';
import AiGeneratorModal from './AiGeneratorModal.vue';
import { message } from 'ant-design-vue';
import { createPreset, type EditorPreset } from '../api/index';

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

// Preset functionality
const showPresetPicker = ref(false);
const savePresetName = ref('');
const showSavePresetInput = ref(false);

async function saveAsPreset() {
  if (!activeBlock.value || !savePresetName.value.trim()) {
    message.warning('Enter a name for this preset');
    return;
  }
  try {
    await createPreset({
      blockType: activeBlock.value,
      name: savePresetName.value,
      attributes: JSON.stringify(blockAttrs.value),
    });
    message.success('Preset saved');
    showSavePresetInput.value = false;
    savePresetName.value = '';
  } catch (err: any) {
    message.error(err?.message || 'Failed to save preset');
  }
}

function applyPreset(preset: EditorPreset) {
  if (!props.editor || !activeBlock.value || !preset.attributes) return;
  try {
    const attrs = JSON.parse(preset.attributes);
    props.editor.chain().focus().updateAttributes(activeBlock.value, attrs).run();
    blockAttrs.value = { ...blockAttrs.value, ...attrs };
    message.success(`Applied preset: ${preset.name}`);
  } catch (err: any) {
    message.error('Failed to apply preset');
  }
}

// AI Generator
const showAiModal = ref(false);
const aiFieldKey = ref('');
const aiFieldType = ref<'text' | 'textarea' | 'code'>('text');
const aiCurrentValue = ref('');

// Find text/textarea/code fields for the active block
const aiEligibleFields = computed(() => {
  if (!activeWidget.value) return [];
  return activeWidget.value.attributes.filter(
    (attr: any) => attr.type === 'text' || attr.type === 'textarea' || attr.type === 'code'
  );
});

function openAiModal(fieldKey: string, fieldType: 'text' | 'textarea' | 'code') {
  aiFieldKey.value = fieldKey;
  aiFieldType.value = fieldType;
  aiCurrentValue.value = blockAttrs.value[fieldKey] || '';
  showAiModal.value = true;
}

function openAiModalForFirstField() {
  const fields = aiEligibleFields.value;
  if (fields.length === 0) {
    message.info('No text fields available for AI generation on this block');
    return;
  }
  // If multiple fields, pick the first text/textarea field
  const field = fields[0];
  openAiModal(field.key, field.type as 'text' | 'textarea' | 'code');
}

function applyAiResult(value: string) {
  if (!aiFieldKey.value || !props.editor || !activeBlock.value) return;
  props.editor.chain().focus().updateAttributes(activeBlock.value, { [aiFieldKey.value]: value }).run();
  blockAttrs.value[aiFieldKey.value] = value;
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
      <!-- Preset Actions -->
      <div class="preset-actions">
        <a-tooltip title="Load a saved preset">
          <button class="preset-btn" @click="showPresetPicker = true">
            <FolderOpen :size="13" />
            <span>Load Preset</span>
          </button>
        </a-tooltip>
        <a-popover v-model:open="showSavePresetInput" trigger="click" placement="bottomRight">
          <template #content>
            <div style="width: 200px;">
              <a-input
                v-model:value="savePresetName"
                placeholder="Preset name"
                size="small"
                class="mb-2"
                @pressEnter="saveAsPreset"
              />
              <a-button type="primary" size="small" block @click="saveAsPreset">Save</a-button>
            </div>
          </template>
          <a-tooltip title="Save current settings as preset">
            <button class="preset-btn">
              <Bookmark :size="13" />
              <span>Save Preset</span>
            </button>
          </a-tooltip>
        </a-popover>
        <a-tooltip v-if="aiEligibleFields.length > 0" title="Generate content with AI">
          <button class="preset-btn preset-btn--ai" @click="openAiModalForFirstField">
            <Wand2 :size="13" />
            <span>AI Generate</span>
          </button>
        </a-tooltip>
      </div>

      <SettingsRenderer
        :attributes="activeWidget.attributes"
        :values="blockAttrs"
        @update="handleUpdate"
      />
    </div>

    <!-- Preset Picker Modal -->
    <PresetPicker
      v-model:open="showPresetPicker"
      :block-type="activeBlock || ''"
      @apply="applyPreset"
    />

    <!-- AI Generator Modal -->
    <AiGeneratorModal
      v-model="showAiModal"
      :field-type="aiFieldType"
      :current-value="aiCurrentValue"
      @apply="applyAiResult"
    />
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
.preset-actions {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}
.preset-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 11px;
  color: #6b7280;
  transition: all 0.15s;
  white-space: nowrap;
}
.preset-btn:hover {
  border-color: #1677ff;
  color: #1677ff;
  background: #f0f5ff;
}
.preset-btn--ai {
  border-color: #7c3aed;
  color: #7c3aed;
}
.preset-btn--ai:hover {
  border-color: #6d28d9;
  color: #6d28d9;
  background: #f5f3ff;
}
</style>
