<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Modal } from 'ant-design-vue';
import { SearchOutlined } from '@ant-design/icons-vue';
import {
  useCommandPalette,
  setupNavigationCommands,
} from '#/composables/useCommandPalette';
import {
  useKeyboardShortcuts,
  formatKey,
} from '#/composables/useKeyboardShortcuts';

const {
  isOpen,
  query,
  selectedIndex,
  filteredCommands,
  groupedCommands,
  open,
  close,
  setQuery,
  executeCommand,
  executeSelected,
  navigateSelection,
  setSelectedIndex,
} = useCommandPalette();

const { register } = useKeyboardShortcuts();

const inputRef = ref<HTMLInputElement | null>(null);

// Register Ctrl+K shortcut
onMounted(() => {
  const unregisterK = register('ctrl+k', () => open(), {
    description: 'Open command palette',
    scope: 'global',
  });

  const unregisterNav = setupNavigationCommands();

  onUnmounted(() => {
    unregisterK();
    unregisterNav();
  });
});

// Focus input when opened
watch(isOpen, (open) => {
  if (open) {
    setTimeout(() => {
      inputRef.value?.focus();
    }, 100);
  }
});

// Handle keyboard navigation
function handleKeyDown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      navigateSelection('down');
      break;
    case 'ArrowUp':
      e.preventDefault();
      navigateSelection('up');
      break;
    case 'Enter':
      e.preventDefault();
      executeSelected();
      break;
    case 'Escape':
      e.preventDefault();
      close();
      break;
  }
}

// Category icons
// Category icons for potential future use
// const categoryIcons: Record<string, string> = {
//   Navigation: 'lucide:compass',
//   Actions: 'lucide:zap',
//   Settings: 'lucide:settings',
// };

// Flatten grouped commands with headers
const displayItems = computed(() => {
  const items: Array<{ type: 'header' | 'command'; data: any; index?: number }> = [];
  let commandIndex = 0;

  for (const [category, commands] of groupedCommands.value) {
    items.push({ type: 'header', data: category });
    for (const command of commands) {
      items.push({ type: 'command', data: command, index: commandIndex++ });
    }
  }

  return items;
});
</script>

<template>
  <Modal
    :open="isOpen"
    :footer="null"
    :closable="false"
    :mask-closable="true"
    :width="560"
    wrap-class-name="command-palette-modal"
    @cancel="close"
  >
    <div class="command-palette" @keydown="handleKeyDown">
      <!-- Search Input -->
      <div class="search-container">
        <SearchOutlined class="search-icon" />
        <input
          ref="inputRef"
          :value="query"
          type="text"
          placeholder="Search commands..."
          class="search-input"
          @input="(e) => setQuery((e.target as HTMLInputElement).value)"
        />
        <kbd class="shortcut-hint">ESC</kbd>
      </div>

      <!-- Results -->
      <div class="results-container">
        <div v-if="filteredCommands.length === 0" class="no-results">
          No commands found
        </div>

        <template v-for="item in displayItems" :key="item.type === 'header' ? `h-${item.data}` : item.data.id">
          <!-- Category Header -->
          <div v-if="item.type === 'header'" class="category-header">
            {{ item.data }}
          </div>

          <!-- Command Item -->
          <div
            v-else
            :class="['command-item', { selected: item.index === selectedIndex }]"
            @click="executeCommand(item.data)"
            @mouseenter="setSelectedIndex(item.index!)"
          >
            <div class="command-info">
              <span class="command-title">{{ item.data.title }}</span>
              <span v-if="item.data.subtitle" class="command-subtitle">
                {{ item.data.subtitle }}
              </span>
            </div>
            <kbd v-if="item.data.shortcut" class="command-shortcut">
              {{ formatKey(item.data.shortcut) }}
            </kbd>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div class="palette-footer">
        <div class="footer-hint">
          <kbd>↑↓</kbd> Navigate
        </div>
        <div class="footer-hint">
          <kbd>↵</kbd> Select
        </div>
        <div class="footer-hint">
          <kbd>ESC</kbd> Close
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.command-palette {
  display: flex;
  flex-direction: column;
  max-height: 70vh;
}

.search-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.search-icon {
  color: #9ca3af;
  font-size: 18px;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  background: transparent;
}

.search-input::placeholder {
  color: #9ca3af;
}

.shortcut-hint {
  padding: 2px 6px;
  font-size: 11px;
  font-family: monospace;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  color: #6b7280;
}

.results-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  max-height: 400px;
}

.no-results {
  padding: 24px;
  text-align: center;
  color: #9ca3af;
}

.category-header {
  padding: 8px 16px 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #9ca3af;
  letter-spacing: 0.05em;
}

.command-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.1s;
}

.command-item:hover,
.command-item.selected {
  background-color: #f3f4f6;
}

.command-item.selected {
  background-color: #e0e7ff;
}

.command-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.command-title {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.command-subtitle {
  font-size: 12px;
  color: #6b7280;
}

.command-shortcut {
  padding: 2px 8px;
  font-size: 11px;
  font-family: monospace;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  color: #6b7280;
}

.palette-footer {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.footer-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.footer-hint kbd {
  padding: 2px 6px;
  font-size: 10px;
  font-family: monospace;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 3px;
}
</style>

<style>
.command-palette-modal .ant-modal-content {
  padding: 0;
  overflow: hidden;
}

.command-palette-modal .ant-modal-body {
  padding: 0;
}
</style>
