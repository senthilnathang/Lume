<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { FolderOpen, Trash2 } from 'lucide-vue-next';
import { message } from 'ant-design-vue';
import { getPresets, deletePreset, type EditorPreset } from '../api/index';

const props = defineProps<{
  open: boolean;
  blockType: string;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'apply', preset: EditorPreset): void;
}>();

const presets = ref<EditorPreset[]>([]);
const loading = ref(false);

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
});

async function fetchPresets() {
  if (!props.blockType) return;
  loading.value = true;
  try {
    const data = await getPresets(props.blockType);
    presets.value = Array.isArray(data) ? data : (data as any)?.data || [];
  } catch {
    presets.value = [];
  } finally {
    loading.value = false;
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen && props.blockType) {
    fetchPresets();
  }
});

function applyPreset(preset: EditorPreset) {
  emit('apply', preset);
  visible.value = false;
}

async function removePreset(preset: EditorPreset, e: Event) {
  e.stopPropagation();
  try {
    await deletePreset(preset.id);
    presets.value = presets.value.filter(p => p.id !== preset.id);
    message.success('Preset deleted');
  } catch (err: any) {
    message.error(err?.message || 'Failed to delete preset');
  }
}
</script>

<template>
  <a-modal
    v-model:open="visible"
    title="Load Preset"
    :footer="null"
    width="480px"
    :destroy-on-close="true"
  >
    <div v-if="loading" class="preset-loading">
      <a-spin />
    </div>
    <div v-else-if="presets.length === 0" class="preset-empty">
      <a-empty description="No presets saved for this block type" />
    </div>
    <div v-else class="preset-list">
      <div
        v-for="preset in presets"
        :key="preset.id"
        class="preset-item"
        @click="applyPreset(preset)"
      >
        <div v-if="preset.thumbnailUrl" class="preset-thumbnail">
          <img :src="preset.thumbnailUrl" :alt="preset.name" />
        </div>
        <div v-else class="preset-thumbnail preset-thumbnail-placeholder">
          <FolderOpen :size="20" />
        </div>
        <div class="preset-info">
          <div class="preset-name">{{ preset.name }}</div>
          <div class="preset-type">{{ preset.blockType }}</div>
        </div>
        <button class="preset-delete" @click="removePreset(preset, $event)" title="Delete preset">
          <Trash2 :size="14" />
        </button>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.preset-loading {
  display: flex;
  justify-content: center;
  padding: 32px;
}
.preset-empty {
  padding: 24px 0;
}
.preset-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}
.preset-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.preset-item:hover {
  border-color: #1677ff;
  background: #f0f5ff;
}
.preset-thumbnail {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}
.preset-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.preset-thumbnail-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  color: #9ca3af;
}
.preset-info {
  flex: 1;
  min-width: 0;
}
.preset-name {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preset-type {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
}
.preset-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: #9ca3af;
  transition: all 0.15s;
  flex-shrink: 0;
}
.preset-delete:hover {
  background: #fee2e2;
  color: #dc2626;
}
</style>
