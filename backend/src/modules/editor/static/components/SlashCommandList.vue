<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code2, Minus,
  Layout, Columns3, ImageIcon, Video, MousePointerClick, MoveVertical,
  AlertTriangle, FileCode2, Table2
} from 'lucide-vue-next';

const props = defineProps<{
  items: Array<{
    title: string;
    description: string;
    icon: string;
    command: (props: any) => void;
  }>;
  command: (item: any) => void;
}>();

const selectedIndex = ref(0);

watch(() => props.items, () => {
  selectedIndex.value = 0;
});

const iconMap: Record<string, any> = {
  'heading-1': Heading1,
  'heading-2': Heading2,
  'heading-3': Heading3,
  'list': List,
  'list-ordered': ListOrdered,
  'quote': Quote,
  'code-2': Code2,
  'minus': Minus,
  'layout': Layout,
  'columns-3': Columns3,
  'image': ImageIcon,
  'video': Video,
  'mouse-pointer-click': MousePointerClick,
  'move-vertical': MoveVertical,
  'alert-triangle': AlertTriangle,
  'file-code-2': FileCode2,
  'table-2': Table2,
};

function selectItem(index: number) {
  const item = props.items[index];
  if (item) {
    props.command(item);
  }
}

function onKeyDown(event: KeyboardEvent): boolean {
  if (event.key === 'ArrowUp') {
    selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length;
    return true;
  }
  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % props.items.length;
    return true;
  }
  if (event.key === 'Enter') {
    selectItem(selectedIndex.value);
    return true;
  }
  return false;
}

defineExpose({ onKeyDown });
</script>

<template>
  <div class="slash-command-list" v-if="items.length">
    <button
      v-for="(item, index) in items"
      :key="item.title"
      :class="['slash-command-item', { 'is-selected': index === selectedIndex }]"
      @click="selectItem(index)"
      @mouseenter="selectedIndex = index"
    >
      <div class="item-icon">
        <component :is="iconMap[item.icon]" :size="18" v-if="iconMap[item.icon]" />
      </div>
      <div class="item-text">
        <div class="item-title">{{ item.title }}</div>
        <div class="item-description">{{ item.description }}</div>
      </div>
    </button>
  </div>
</template>

<style scoped>
.slash-command-list {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 4px;
  max-height: 320px;
  overflow-y: auto;
  width: 280px;
}

.slash-command-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}

.slash-command-item:hover,
.slash-command-item.is-selected {
  background: #f0f5ff;
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #f3f4f6;
  border-radius: 6px;
  color: #6b7280;
  flex-shrink: 0;
}

.slash-command-item.is-selected .item-icon {
  background: #dbeafe;
  color: #1677ff;
}

.item-text {
  min-width: 0;
}

.item-title {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
}

.item-description {
  font-size: 11px;
  color: #9ca3af;
}
</style>
