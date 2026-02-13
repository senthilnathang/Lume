<script setup lang="ts">
import type { Component } from 'vue';

import { onMounted, onUnmounted, ref, watch } from 'vue';

import { Modal, Spin, Tag } from 'ant-design-vue';
import {
  BuildOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  FileOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';

import { useGlobalSearch } from '#/composables/useGlobalSearch';
import { useKeyboardShortcuts } from '#/composables/useKeyboardShortcuts';

const {
  isOpen,
  query,
  results,
  totalCount,
  loading,
  error,
  selectedIndex,
  recentSearches,
  open,
  close,
  setQuery,
  navigateSelection,
  setSelectedIndex,
  navigateToResult,
  navigateToSelected,
  clearRecentSearches,
  getModelDisplayName,
} = useGlobalSearch();

const { register } = useKeyboardShortcuts();

const inputRef = ref<HTMLInputElement | null>(null);

// Icon mapping helper
const iconMap: Record<string, Component> = {
  user: UserOutlined,
  building: BuildOutlined,
  users: TeamOutlined,
  file: FileOutlined,
};

function getIconComponent(iconName: string): Component {
  return iconMap[iconName] || FileOutlined;
}

// Register Ctrl+/ shortcut for global search
onMounted(() => {
  const unregisterSlash = register('ctrl+/', () => open(), {
    description: 'Open global search',
    scope: 'global',
  });

  onUnmounted(() => {
    unregisterSlash();
  });
});

// Focus input when opened
watch(isOpen, (isOpenValue) => {
  if (isOpenValue) {
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
      navigateToSelected();
      break;
    case 'Escape':
      e.preventDefault();
      close();
      break;
  }
}

// Track cumulative index for selection
function getItemIndex(modelName: string, itemIndex: number): number {
  let cumulative = 0;
  for (const [name, items] of Object.entries(results.value)) {
    if (name === modelName) {
      return cumulative + itemIndex;
    }
    cumulative += items.length;
  }
  return 0;
}

// Handle recent search click
function handleRecentClick(searchQuery: string) {
  setQuery(searchQuery, false);
}
</script>

<template>
  <Modal
    :open="isOpen"
    :footer="null"
    :closable="false"
    :mask-closable="true"
    :width="600"
    wrap-class-name="global-search-modal"
    @cancel="close"
  >
    <div class="global-search" @keydown="handleKeyDown">
      <!-- Search Input -->
      <div class="search-header">
        <SearchOutlined class="search-icon" />
        <input
          ref="inputRef"
          :value="query"
          type="text"
          placeholder="Search users, companies, records..."
          class="search-input"
          @input="(e) => setQuery((e.target as HTMLInputElement).value)"
        />
        <Spin v-if="loading" size="small" class="loading-spinner" />
        <kbd class="shortcut-hint">ESC</kbd>
      </div>

      <!-- Results -->
      <div class="results-container">
        <!-- Recent Searches (when no query) -->
        <div v-if="!query && recentSearches.length > 0" class="recent-searches">
          <div class="section-header">
            <ClockCircleOutlined />
            <span>Recent Searches</span>
            <button class="clear-btn" @click="clearRecentSearches">
              Clear
            </button>
          </div>
          <div
            v-for="recentQuery in recentSearches"
            :key="recentQuery"
            class="recent-item"
            @click="handleRecentClick(recentQuery)"
          >
            <ClockCircleOutlined class="recent-icon" />
            <span>{{ recentQuery }}</span>
          </div>
        </div>

        <!-- No Query Message -->
        <div v-else-if="!query" class="no-query">
          <p>Type at least 2 characters to search</p>
        </div>

        <!-- Loading State -->
        <div
          v-else-if="loading && Object.keys(results).length === 0"
          class="loading-state"
        >
          <Spin />
          <span>Searching...</span>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-state">
          <CloseOutlined class="error-icon" />
          <span>{{ error }}</span>
        </div>

        <!-- No Results -->
        <div v-else-if="totalCount === 0 && query.length >= 2" class="no-results">
          <SearchOutlined class="no-results-icon" />
          <p>No results found for "{{ query }}"</p>
          <p class="hint">Try different keywords or check spelling</p>
        </div>

        <!-- Search Results -->
        <template v-else>
          <div
            v-for="(items, modelName) in results"
            :key="modelName"
            class="result-group"
          >
            <div class="group-header">
              <span class="group-title">{{
                getModelDisplayName(modelName as string)
              }}</span>
              <Tag size="small">{{ items.length }}</Tag>
            </div>

            <div
              v-for="(item, itemIdx) in items"
              :key="item.id"
              :class="[
                'result-item',
                {
                  selected:
                    selectedIndex === getItemIndex(modelName as string, itemIdx),
                },
              ]"
              @click="navigateToResult(item)"
              @mouseenter="
                setSelectedIndex(getItemIndex(modelName as string, itemIdx))
              "
            >
              <div class="item-icon">
                <component :is="getIconComponent(item.icon)" />
              </div>
              <div class="item-content">
                <span class="item-title">{{ item.title }}</span>
                <span v-if="item.subtitle" class="item-subtitle">
                  {{ item.subtitle }}
                </span>
              </div>
              <div class="item-type">
                <Tag size="small" color="blue">{{ item.type }}</Tag>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div class="search-footer">
        <div class="footer-hint"><kbd>↑↓</kbd> Navigate</div>
        <div class="footer-hint"><kbd>↵</kbd> Open</div>
        <div class="footer-hint"><kbd>ESC</kbd> Close</div>
        <div v-if="totalCount > 0" class="footer-count">
          {{ totalCount }} result{{ totalCount !== 1 ? 's' : '' }}
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.global-search {
  display: flex;
  flex-direction: column;
  max-height: 70vh;
}

.search-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.search-icon {
  color: #9ca3af;
  font-size: 20px;
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

.loading-spinner {
  margin-right: 8px;
}

.shortcut-hint {
  padding: 4px 8px;
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
  max-height: 450px;
  min-height: 200px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}

.section-header .clear-btn {
  margin-left: auto;
  padding: 2px 8px;
  font-size: 11px;
  color: #3b82f6;
  background: none;
  border: none;
  cursor: pointer;
}

.section-header .clear-btn:hover {
  text-decoration: underline;
}

.recent-searches {
  margin-bottom: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.1s;
}

.recent-item:hover {
  background-color: #f3f4f6;
}

.recent-icon {
  color: #9ca3af;
}

.no-query,
.loading-state,
.error-state,
.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: #6b7280;
}

.loading-state {
  flex-direction: row;
  gap: 12px;
}

.error-state {
  color: #ef4444;
}

.error-icon,
.no-results-icon {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.no-results .hint {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.result-group {
  margin-bottom: 12px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px 4px;
}

.group-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #9ca3af;
  letter-spacing: 0.05em;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.1s;
}

.result-item:hover,
.result-item.selected {
  background-color: #f3f4f6;
}

.result-item.selected {
  background-color: #e0e7ff;
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: #f3f4f6;
  color: #6b7280;
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-subtitle {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-type {
  flex-shrink: 0;
}

.search-footer {
  display: flex;
  gap: 16px;
  padding: 10px 16px;
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

.footer-count {
  margin-left: auto;
  font-size: 12px;
  color: #9ca3af;
}
</style>

<style>
.global-search-modal .ant-modal-content {
  padding: 0;
  overflow: hidden;
}

.global-search-modal .ant-modal-body {
  padding: 0;
}
</style>
