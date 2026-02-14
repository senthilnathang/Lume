/**
 * Global Search Component
 *
 * A command palette / global search component for searching across all models.
 * Supports keyboard shortcuts, recent searches, and grouped results.
 *
 * Usage:
 * <GlobalSearch
 *   :visible="searchVisible"
 *   @close="searchVisible = false"
 *   @select="handleSelect"
 * />
 *
 * Or as inline input:
 * <GlobalSearch :inline="true" placeholder="Search..." />
 */

import { computed, defineComponent, h, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  Avatar,
  Button,
  Divider,
  Empty,
  Input,
  List,
  Modal,
  Space,
  Spin,
  Tag,
  Typography,
} from 'ant-design-vue';
import {
  Clock,
  X,
  File,
  Folder,
  Search,
  Settings,
  Users,
  User,
} from 'lucide-vue-next';
import { get } from '@/api/request';

// Model type to icon mapping
const MODEL_ICONS = {
  user: User,
  company: Folder,
  department: Users,
  employee: User,
  project: Folder,
  task: File,
  default: File,
};

// Model type to color mapping
const MODEL_COLORS = {
  user: '#1890ff',
  company: '#52c41a',
  department: '#722ed1',
  employee: '#13c2c2',
  project: '#fa8c16',
  task: '#eb2f96',
  default: '#666',
};

export default defineComponent({
  name: 'GlobalSearch',
  props: {
    // Modal visibility (for modal mode)
    visible: {
      type: Boolean,
      default: false,
    },
    // Use inline mode instead of modal
    inline: {
      type: Boolean,
      default: false,
    },
    // Input placeholder
    placeholder: {
      type: String,
      default: 'Search users, companies, records...',
    },
    // Models to search (comma-separated, empty = all)
    models: {
      type: String,
      default: '',
    },
    // Max results per model
    limit: {
      type: Number,
      default: 5,
    },
    // Show recent searches
    showRecent: {
      type: Boolean,
      default: true,
    },
    // Enable keyboard shortcut (Cmd/Ctrl + K)
    enableShortcut: {
      type: Boolean,
      default: true,
    },
    // Auto focus input
    autoFocus: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:visible', 'close', 'select'],
  setup(props, { emit }) {
    const searchQuery = ref('');
    const loading = ref(false);
    const results = ref({});
    const recentSearches = ref([]);
    const availableModels = ref([]);
    const selectedIndex = ref(-1);
    const inputRef = ref(null);
    const dropdownVisible = ref(false);

    let debounceTimer = null;

    // Flatten results for keyboard navigation
    const flatResults = computed(() => {
      const flat = [];
      for (const [modelName, items] of Object.entries(results.value)) {
        for (const item of items) {
          flat.push({ ...item, _modelName: modelName });
        }
      }
      return flat;
    });

    const totalResults = computed(() => flatResults.value.length);

    const hasResults = computed(() => totalResults.value > 0);

    // Fetch available models
    async function fetchModels() {
      try {
        const res = await get('/search/models');
        availableModels.value = res;
      } catch (err) {
        console.error('Failed to fetch searchable models:', err);
      }
    }

    // Fetch recent searches
    async function fetchRecentSearches() {
      if (!props.showRecent) return;
      try {
        const res = await get('/search/recent?limit=5');
        recentSearches.value = res || [];
      } catch (err) {
        console.error('Failed to fetch recent searches:', err);
      }
    }

    // Perform search
    async function performSearch(query) {
      if (!query || query.length < 2) {
        results.value = {};
        return;
      }

      loading.value = true;
      try {
        const params = new URLSearchParams({
          q: query,
          limit: props.limit.toString(),
        });
        if (props.models) {
          params.append('models', props.models);
        }

        const res = await get(`/search?${params.toString()}`);
        results.value = res.results || {};
        selectedIndex.value = hasResults.value ? 0 : -1;
      } catch (err) {
        console.error('Search failed:', err);
        results.value = {};
      } finally {
        loading.value = false;
      }
    }

    // Debounced search
    function debouncedSearch(query) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        performSearch(query);
      }, 300);
    }

    // Handle input change
    function handleInputChange(e) {
      const value = e.target?.value || e;
      searchQuery.value = value;
      debouncedSearch(value);
    }

    // Handle result selection
    function handleSelect(result) {
      emit('select', result);
      if (result.route) {
        window.location.href = result.route;
      }
      handleClose();
    }

    // Handle recent search click
    function handleRecentClick(query) {
      searchQuery.value = query;
      performSearch(query);
    }

    // Handle close
    function handleClose() {
      searchQuery.value = '';
      results.value = {};
      selectedIndex.value = -1;
      dropdownVisible.value = false;
      emit('update:visible', false);
      emit('close');
    }

    // Keyboard navigation
    function handleKeyDown(e) {
      if (!hasResults.value) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          selectedIndex.value = Math.min(selectedIndex.value + 1, totalResults.value - 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex.value >= 0 && selectedIndex.value < flatResults.value.length) {
            handleSelect(flatResults.value[selectedIndex.value]);
          }
          break;
        case 'Escape':
          handleClose();
          break;
      }
    }

    // Global keyboard shortcut
    function handleGlobalKeyDown(e) {
      if (props.enableShortcut && (e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        emit('update:visible', true);
      }
    }

    // Get icon for model type
    function getModelIcon(modelName) {
      return MODEL_ICONS[modelName.toLowerCase()] || MODEL_ICONS.default;
    }

    // Get color for model type
    function getModelColor(modelName) {
      return MODEL_COLORS[modelName.toLowerCase()] || MODEL_COLORS.default;
    }

    // Watch visibility for auto-focus
    watch(() => props.visible, (isVisible) => {
      if (isVisible && props.autoFocus) {
        nextTick(() => {
          inputRef.value?.focus?.();
        });
        fetchRecentSearches();
      }
    });

    // Lifecycle
    onMounted(() => {
      fetchModels();
      if (props.enableShortcut && !props.inline) {
        document.addEventListener('keydown', handleGlobalKeyDown);
      }
    });

    onUnmounted(() => {
      if (props.enableShortcut && !props.inline) {
        document.removeEventListener('keydown', handleGlobalKeyDown);
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    });

    // Render result item
    function renderResultItem(result, index, modelName) {
      const IconComponent = getModelIcon(modelName);
      const color = getModelColor(modelName);
      const isSelected = flatResults.value.indexOf(result) === selectedIndex.value;

      return h('div', {
        key: `${modelName}-${result.id}`,
        class: ['search-result-item', { selected: isSelected }],
        style: {
          padding: '10px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: isSelected ? '#f5f5f5' : 'transparent',
          borderLeft: isSelected ? `3px solid ${color}` : '3px solid transparent',
          transition: 'all 0.15s',
        },
        onClick: () => handleSelect(result),
        onMouseenter: () => {
          selectedIndex.value = flatResults.value.indexOf(result);
        },
      }, [
        // Icon
        h('div', {
          style: {
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          },
        }, h(IconComponent, { size: 18, style: { color } })),

        // Content
        h('div', { style: { flex: 1, minWidth: 0 } }, [
          h('div', {
            style: {
              fontWeight: '500',
              fontSize: '14px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          }, result.title),
          result.subtitle && h(Typography.Text, {
            type: 'secondary',
            style: {
              fontSize: '12px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          }, () => result.subtitle),
        ]),

        // Type tag
        h(Tag, {
          style: { marginLeft: 'auto', flexShrink: 0 },
          color: color,
        }, () => modelName),
      ]);
    }

    // Render results grouped by model
    function renderResults() {
      if (loading.value) {
        return h('div', {
          style: { textAlign: 'center', padding: '40px' },
        }, h(Spin, { tip: 'Searching...' }));
      }

      if (searchQuery.value.length < 2) {
        // Show recent searches
        if (props.showRecent && recentSearches.value.length > 0) {
          return h('div', { style: { padding: '8px 0' } }, [
            h('div', {
              style: {
                padding: '8px 16px',
                fontSize: '12px',
                color: '#999',
                fontWeight: '500',
              },
            }, 'Recent Searches'),
            ...recentSearches.value.map(query =>
              h('div', {
                key: query,
                style: {
                  padding: '8px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                },
                onClick: () => handleRecentClick(query),
                onMouseenter: (e) => { e.currentTarget.style.backgroundColor = '#f5f5f5'; },
                onMouseleave: (e) => { e.currentTarget.style.backgroundColor = 'transparent'; },
              }, [
                h(Clock, { size: 18, style: { color: '#999' } }),
                h('span', query),
              ])
            ),
          ]);
        }

        return h(Empty, {
          description: 'Type at least 2 characters to search',
          image: Empty.PRESENTED_IMAGE_SIMPLE,
          style: { padding: '40px 0' },
        });
      }

      if (!hasResults.value) {
        return h(Empty, {
          description: `No results found for "${searchQuery.value}"`,
          image: Empty.PRESENTED_IMAGE_SIMPLE,
          style: { padding: '40px 0' },
        });
      }

      // Group results by model
      const groups = [];
      for (const [modelName, items] of Object.entries(results.value)) {
        if (items.length === 0) continue;

        groups.push(
          h('div', { key: modelName }, [
            // Group header
            h('div', {
              style: {
                padding: '8px 16px 4px',
                fontSize: '12px',
                color: '#999',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              },
            }, `${modelName} (${items.length})`),

            // Items
            ...items.map((item, index) => renderResultItem(item, index, modelName)),
          ])
        );
      }

      return h('div', {
        style: { maxHeight: '400px', overflowY: 'auto' },
      }, groups);
    }

    // Render search input
    function renderInput() {
      return h(Input, {
        ref: inputRef,
        value: searchQuery.value,
        placeholder: props.placeholder,
        prefix: h(Search, { size: 18, style: { color: '#999' } }),
        suffix: searchQuery.value
          ? h(X, {
              size: 18,
              style: { color: '#999', cursor: 'pointer' },
              onClick: () => {
                searchQuery.value = '';
                results.value = {};
              },
            })
          : null,
        allowClear: false,
        size: 'large',
        style: { borderRadius: props.inline ? '8px' : '0' },
        onInput: handleInputChange,
        onKeydown: handleKeyDown,
      });
    }

    // Render inline mode
    function renderInline() {
      return h('div', {
        class: 'global-search-inline',
        style: { position: 'relative' },
      }, [
        renderInput(),
        (searchQuery.value.length >= 2 || (props.showRecent && recentSearches.value.length > 0))
          && dropdownVisible.value
          && h('div', {
            style: {
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
              marginTop: '4px',
              zIndex: 1000,
            },
          }, renderResults()),
      ]);
    }

    // Render modal mode
    function renderModal() {
      return h(Modal, {
        open: props.visible,
        'onUpdate:open': (v) => emit('update:visible', v),
        footer: null,
        closable: false,
        width: 600,
        centered: true,
        bodyStyle: { padding: 0 },
        maskStyle: { backgroundColor: 'rgba(0,0,0,0.4)' },
        onCancel: handleClose,
      }, {
        default: () => h('div', { class: 'global-search-modal' }, [
          // Search input
          h('div', {
            style: {
              padding: '16px',
              borderBottom: '1px solid #f0f0f0',
            },
          }, renderInput()),

          // Results
          h('div', { style: { minHeight: '200px' } }, renderResults()),

          // Footer with keyboard hints
          h('div', {
            style: {
              padding: '8px 16px',
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              gap: '16px',
              fontSize: '12px',
              color: '#999',
            },
          }, [
            h('span', [
              h('kbd', { style: { padding: '2px 6px', background: '#f5f5f5', borderRadius: '4px', marginRight: '4px' } }, 'Enter'),
              'to select',
            ]),
            h('span', [
              h('kbd', { style: { padding: '2px 6px', background: '#f5f5f5', borderRadius: '4px', marginRight: '4px' } }, 'Esc'),
              'to close',
            ]),
          ]),
        ]),
      });
    }

    // Main render
    return () => {
      if (props.inline) {
        return renderInline();
      }
      return renderModal();
    };
  },
});
