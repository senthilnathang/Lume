<script lang="ts" setup>
/**
 * TemplatePicker Component
 *
 * Shows a dropdown of text templates when triggered.
 * Templates can be triggered by typing / or ! in the input.
 */
import { computed, ref, watch } from 'vue';

import { Input, List, Tag, Empty, Spin } from 'ant-design-vue';
import { SearchOutlined } from '@ant-design/icons-vue';

import {
  searchTemplatesApi,
  type TemplateApi,
} from '#/api/core/template';

// Props
interface Props {
  /** Whether the picker is visible */
  visible: boolean;
  /** Current search query (shortcut prefix) */
  searchQuery?: string;
  /** Position style for the picker */
  position?: { top?: string; left?: string; bottom?: string; right?: string };
}

const props = withDefaults(defineProps<Props>(), {
  searchQuery: '',
  position: () => ({ bottom: '100%', left: '0' }),
});

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'select', template: TemplateApi.Template): void;
  (e: 'expand', content: string): void;
}>();

// State
const loading = ref(false);
const templates = ref<TemplateApi.Template[]>([]);
const searchInput = ref('');
const selectedIndex = ref(0);
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

// Computed
const displayTemplates = computed(() => {
  if (!searchInput.value && !props.searchQuery) {
    return templates.value.slice(0, 10);
  }
  return templates.value;
});

// Watch search query changes
watch(
  () => props.searchQuery,
  (query) => {
    if (query) {
      searchInput.value = query;
      performSearch(query);
    }
  },
);

watch(
  () => searchInput.value,
  (query) => {
    if (searchTimeout.value) {
      clearTimeout(searchTimeout.value);
    }
    searchTimeout.value = setTimeout(() => {
      performSearch(query);
    }, 200);
  },
);

watch(
  () => props.visible,
  (visible) => {
    if (visible && !templates.value.length) {
      performSearch('');
    }
    selectedIndex.value = 0;
  },
);

// Methods
async function performSearch(query: string) {
  loading.value = true;
  try {
    if (query) {
      templates.value = await searchTemplatesApi(query, 20);
    } else {
      const response = await searchTemplatesApi('', 20);
      templates.value = response;
    }
    selectedIndex.value = 0;
  } catch (error) {
    console.error('Failed to search templates:', error);
    templates.value = [];
  } finally {
    loading.value = false;
  }
}

async function selectTemplate(template: TemplateApi.Template) {
  emit('select', template);
  emit('expand', template.content);
  emit('update:visible', false);
}

function handleKeyDown(event: KeyboardEvent) {
  if (!props.visible) return;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      selectedIndex.value = Math.min(
        selectedIndex.value + 1,
        displayTemplates.value.length - 1,
      );
      break;
    case 'ArrowUp':
      event.preventDefault();
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
      break;
    case 'Enter':
      event.preventDefault();
      if (displayTemplates.value[selectedIndex.value]) {
        selectTemplate(displayTemplates.value[selectedIndex.value]!);
      }
      break;
    case 'Escape':
      event.preventDefault();
      emit('update:visible', false);
      break;
  }
}

// Expose for parent component
defineExpose({
  handleKeyDown,
  selectTemplate,
});
</script>

<template>
  <div
    v-if="visible"
    class="template-picker"
    :style="position"
  >
    <div class="template-picker-header">
      <Input
        v-model:value="searchInput"
        placeholder="Search templates..."
        size="small"
        :prefix="SearchOutlined"
        allow-clear
        @keydown="handleKeyDown"
      >
        <template #prefix>
          <SearchOutlined class="text-gray-400" />
        </template>
      </Input>
    </div>

    <div class="template-picker-content">
      <Spin v-if="loading" size="small" class="template-picker-loading" />

      <Empty
        v-else-if="displayTemplates.length === 0"
        description="No templates found"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />

      <List
        v-else
        :data-source="displayTemplates"
        size="small"
        :split="false"
      >
        <template #renderItem="{ item: template, index }">
          <div
            :class="[
              'template-item',
              { 'template-item--selected': index === selectedIndex },
            ]"
            @click="selectTemplate(template)"
            @mouseenter="selectedIndex = index"
          >
            <div class="template-item-header">
              <span class="template-shortcut">{{ template.shortcut }}</span>
              <span class="template-name">{{ template.name }}</span>
              <Tag v-if="template.is_system" size="small" color="blue">
                System
              </Tag>
            </div>
            <div class="template-preview">
              {{ template.content.slice(0, 80) }}{{ template.content.length > 80 ? '...' : '' }}
            </div>
          </div>
        </template>
      </List>
    </div>

    <div class="template-picker-footer">
      <span class="template-hint">
        <kbd>↑</kbd> <kbd>↓</kbd> to navigate
        <kbd>Enter</kbd> to select
        <kbd>Esc</kbd> to close
      </span>
    </div>
  </div>
</template>

<style scoped>
.template-picker {
  position: absolute;
  z-index: 1000;
  width: 320px;
  max-height: 400px;
  background: var(--ant-color-bg-container);
  border: 1px solid var(--ant-color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.template-picker-header {
  padding: 8px;
  border-bottom: 1px solid var(--ant-color-border);
}

.template-picker-content {
  max-height: 280px;
  overflow-y: auto;
}

.template-picker-loading {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.template-item {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.template-item:hover,
.template-item--selected {
  background: var(--ant-color-bg-text-hover);
}

.template-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.template-shortcut {
  font-family: monospace;
  font-weight: 600;
  color: var(--ant-color-primary);
}

.template-name {
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-preview {
  font-size: 12px;
  color: var(--ant-color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-picker-footer {
  padding: 6px 12px;
  border-top: 1px solid var(--ant-color-border);
  background: var(--ant-color-bg-layout);
}

.template-hint {
  font-size: 11px;
  color: var(--ant-color-text-secondary);
}

.template-hint kbd {
  display: inline-block;
  padding: 0 4px;
  margin: 0 2px;
  font-size: 10px;
  background: var(--ant-color-bg-container);
  border: 1px solid var(--ant-color-border);
  border-radius: 3px;
}
</style>
