<script setup lang="ts">
import { computed } from 'vue';
import { Keyboard } from 'lucide-vue-next';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
});

interface ShortcutEntry {
  keys: string;
  description: string;
  category: string;
}

const shortcuts: ShortcutEntry[] = [
  // General
  { keys: 'Ctrl + S', description: 'Save page', category: 'General' },
  { keys: 'Ctrl + Z', description: 'Undo', category: 'General' },
  { keys: 'Ctrl + Y', description: 'Redo', category: 'General' },
  { keys: 'Ctrl + Shift + Z', description: 'Redo (alternate)', category: 'General' },
  { keys: '?', description: 'Show keyboard shortcuts', category: 'General' },

  // Block Operations
  { keys: 'Ctrl + D', description: 'Duplicate selected block', category: 'Block Operations' },
  { keys: 'Ctrl + C', description: 'Copy selected block', category: 'Block Operations' },
  { keys: 'Ctrl + V', description: 'Paste block', category: 'Block Operations' },
  { keys: 'Delete', description: 'Delete selected block', category: 'Block Operations' },

  // View
  { keys: 'Ctrl + Shift + M', description: 'Toggle mobile preview', category: 'View' },

  // Text Formatting
  { keys: 'Ctrl + B', description: 'Bold text', category: 'Text Formatting' },
  { keys: 'Ctrl + I', description: 'Italic text', category: 'Text Formatting' },
  { keys: 'Ctrl + U', description: 'Underline text', category: 'Text Formatting' },
  { keys: 'Ctrl + K', description: 'Insert link', category: 'Text Formatting' },

  // Slash Commands
  { keys: '/', description: 'Open block inserter (slash commands)', category: 'Slash Commands' },
];

const categories = computed(() => {
  const cats = new Map<string, ShortcutEntry[]>();
  for (const s of shortcuts) {
    if (!cats.has(s.category)) cats.set(s.category, []);
    cats.get(s.category)!.push(s);
  }
  return cats;
});
</script>

<template>
  <a-modal
    v-model:open="visible"
    title=""
    :footer="null"
    width="520px"
    :destroy-on-close="true"
    class="shortcuts-modal"
  >
    <div class="shortcuts-title">
      <Keyboard :size="18" />
      <h3>Keyboard Shortcuts</h3>
    </div>

    <div class="shortcuts-content">
      <div v-for="[category, items] in categories" :key="category" class="shortcut-category">
        <h4 class="category-title">{{ category }}</h4>
        <div class="shortcut-list">
          <div
            v-for="item in items"
            :key="item.keys"
            class="shortcut-row"
          >
            <span class="shortcut-desc">{{ item.description }}</span>
            <span class="shortcut-keys">
              <template v-for="(key, kIdx) in item.keys.split(' + ')" :key="kIdx">
                <span v-if="kIdx > 0" class="key-separator">+</span>
                <kbd class="key-badge">{{ key }}</kbd>
              </template>
            </span>
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.shortcuts-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  color: #1f2937;
}
.shortcuts-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.shortcuts-content {
  max-height: 480px;
  overflow-y: auto;
}
.shortcut-category {
  margin-bottom: 20px;
}
.shortcut-category:last-child {
  margin-bottom: 0;
}
.category-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  margin: 0 0 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f3f4f6;
}
.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 4px;
}
.shortcut-row:hover {
  background: #f9fafb;
}
.shortcut-desc {
  font-size: 13px;
  color: #374151;
}
.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.key-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 11px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', Monaco, monospace;
  color: #374151;
  box-shadow: 0 1px 0 #d1d5db;
}
.key-separator {
  font-size: 11px;
  color: #9ca3af;
}
</style>
