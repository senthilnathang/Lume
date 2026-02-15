<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Search, Clock, ArrowRight } from 'lucide-vue-next';
import { get } from '@/api/request';

/**
 * CommandPalette - Global search component triggered via Ctrl+K
 *
 * Provides a command palette overlay for searching across all Lume models.
 * Groups results by type, supports keyboard navigation, and stores recent searches.
 */

// --- Props & Emits ---

defineOptions({ name: 'CommandPalette' });

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const props = defineProps<{
  visible: boolean;
}>();

// --- Constants ---

const RECENT_SEARCHES_KEY = 'lume_recent_searches';
const MAX_RECENT = 8;
const DEBOUNCE_MS = 300;

const MODEL_PATH_MAP: Record<string, string> = {
  activities: '/activities',
  user: '/settings/users',
  team_members: '/team',
  donations: '/donations',
  donors: '/donations/donors',
  documents: '/documents',
  messages: '/messages',
  campaigns: '/donations/campaigns',
};

// --- State ---

const router = useRouter();
const searchInput = ref<HTMLInputElement | null>(null);
const query = ref('');
const loading = ref(false);
const results = ref<Array<{
  id: string | number;
  title: string;
  description?: string;
  group: string;
  model?: string;
}>>([]);
const activeIndex = ref(-1);
const recentSearches = ref<string[]>([]);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// --- Computed ---

const groupedResults = computed(() => {
  const groups: Record<string, typeof results.value> = {};
  for (const item of results.value) {
    const group = item.group || 'Other';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
  }
  return groups;
});

const flatResults = computed(() => {
  const flat: typeof results.value = [];
  for (const items of Object.values(groupedResults.value)) {
    flat.push(...items);
  }
  return flat;
});

const hasQuery = computed(() => query.value.trim().length > 0);
const hasResults = computed(() => flatResults.value.length > 0);
const showRecent = computed(() => !hasQuery.value && recentSearches.value.length > 0);

// --- Recent Searches ---

function loadRecentSearches() {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    recentSearches.value = stored ? JSON.parse(stored) : [];
  } catch {
    recentSearches.value = [];
  }
}

function saveRecentSearch(term: string) {
  const trimmed = term.trim();
  if (!trimmed) return;

  const filtered = recentSearches.value.filter((s) => s !== trimmed);
  filtered.unshift(trimmed);
  recentSearches.value = filtered.slice(0, MAX_RECENT);

  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches.value));
  } catch {
    // localStorage may be full or unavailable
  }
}

// --- Search ---

async function performSearch(term: string) {
  const trimmed = term.trim();
  if (!trimmed) {
    results.value = [];
    activeIndex.value = -1;
    return;
  }

  loading.value = true;
  try {
    const data = await get('/search', { q: trimmed });
    // API may return an array directly or { results: [...] }
    if (Array.isArray(data)) {
      results.value = data;
    } else if (data && Array.isArray(data.results)) {
      results.value = data.results;
    } else if (data && typeof data === 'object') {
      // Handle grouped object format { modelName: items[] }
      const flat: typeof results.value = [];
      for (const [group, items] of Object.entries(data)) {
        if (Array.isArray(items)) {
          for (const item of items as any[]) {
            flat.push({ ...item, group: item.group || group });
          }
        }
      }
      results.value = flat;
    } else {
      results.value = [];
    }
    activeIndex.value = results.value.length > 0 ? 0 : -1;
  } catch {
    results.value = [];
    activeIndex.value = -1;
  } finally {
    loading.value = false;
  }
}

function onInput(e: Event) {
  const target = e.target as HTMLInputElement;
  query.value = target.value;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    performSearch(query.value);
  }, DEBOUNCE_MS);
}

// --- Navigation ---

function getResultPath(result: { model?: string; group?: string; id?: string | number }): string {
  const key = result.model || result.group || '';
  const basePath = MODEL_PATH_MAP[key.toLowerCase()] || MODEL_PATH_MAP[key] || `/${key.toLowerCase()}`;
  if (result.id) {
    return `${basePath}/${result.id}`;
  }
  return basePath;
}

function selectResult(result: (typeof results.value)[0]) {
  saveRecentSearch(query.value);
  const path = getResultPath(result);
  close();
  router.push(path);
}

function selectRecent(term: string) {
  query.value = term;
  performSearch(term);
}

function close() {
  query.value = '';
  results.value = [];
  activeIndex.value = -1;
  loading.value = false;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  emit('close');
}

// --- Keyboard ---

function onKeydown(e: KeyboardEvent) {
  const total = flatResults.value.length;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (total > 0) {
        activeIndex.value = (activeIndex.value + 1) % total;
        scrollActiveIntoView();
      }
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (total > 0) {
        activeIndex.value = (activeIndex.value - 1 + total) % total;
        scrollActiveIntoView();
      }
      break;
    case 'Enter':
      e.preventDefault();
      if (activeIndex.value >= 0 && activeIndex.value < total) {
        selectResult(flatResults.value[activeIndex.value]);
      }
      break;
    case 'Escape':
      e.preventDefault();
      close();
      break;
  }
}

function scrollActiveIntoView() {
  nextTick(() => {
    const el = document.querySelector('[data-result-active="true"]');
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  });
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    if (!props.visible) {
      // Parent controls visibility; this is a hint that the parent should
      // toggle. In practice, parent listens for Ctrl+K and sets visible=true.
    } else {
      close();
    }
  }
}

// --- Helpers ---

function getFlatIndex(result: (typeof results.value)[0]): number {
  return flatResults.value.indexOf(result);
}

// --- Watchers ---

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      loadRecentSearches();
      nextTick(() => {
        searchInput.value?.focus();
      });
    }
  }
);

// --- Lifecycle ---

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
  loadRecentSearches();
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
});
</script>

<template>
  <a-modal
    :open="visible"
    :footer="null"
    :closable="false"
    :width="640"
    :centered="true"
    :body-style="{ padding: 0 }"
    :mask-style="{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }"
    wrap-class-name="command-palette-wrap"
    @cancel="close"
  >
    <!-- Search Input -->
    <div class="flex items-center border-b border-gray-200 px-4">
      <Search class="h-5 w-5 text-gray-400 shrink-0" />
      <input
        ref="searchInput"
        :value="query"
        type="text"
        placeholder="Search activities, users, documents..."
        class="w-full border-0 bg-transparent py-3.5 px-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-0"
        @input="onInput"
        @keydown="onKeydown"
      />
      <kbd
        class="hidden sm:inline-flex items-center rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs text-gray-500 font-mono"
      >
        ESC
      </kbd>
    </div>

    <!-- Results area -->
    <div class="max-h-[400px] overflow-y-auto">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12 text-gray-400">
        <a-spin size="small" />
        <span class="ml-2 text-sm">Searching...</span>
      </div>

      <!-- Recent Searches -->
      <div v-else-if="showRecent" class="py-2">
        <div class="px-4 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
          Recent Searches
        </div>
        <div
          v-for="term in recentSearches"
          :key="term"
          class="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
          @click="selectRecent(term)"
        >
          <Clock class="h-4 w-4 text-gray-300 shrink-0" />
          <span class="text-sm text-gray-600 truncate">{{ term }}</span>
        </div>
      </div>

      <!-- Grouped Results -->
      <div v-else-if="hasResults" class="py-2">
        <template v-for="(items, group) in groupedResults" :key="group">
          <div class="px-4 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
            {{ group }}
          </div>
          <div
            v-for="result in items"
            :key="`${result.group}-${result.id}`"
            :data-result-active="getFlatIndex(result) === activeIndex ? 'true' : undefined"
            class="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
            :class="getFlatIndex(result) === activeIndex ? 'bg-blue-50 border-l-2 border-blue-500' : 'border-l-2 border-transparent hover:bg-gray-50'"
            @click="selectResult(result)"
            @mouseenter="activeIndex = getFlatIndex(result)"
          >
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 truncate">
                {{ result.title }}
              </div>
              <div v-if="result.description" class="text-xs text-gray-400 truncate mt-0.5">
                {{ result.description }}
              </div>
            </div>
            <span class="text-xs text-gray-400 shrink-0">{{ result.group }}</span>
            <ArrowRight
              v-if="getFlatIndex(result) === activeIndex"
              class="h-4 w-4 text-blue-500 shrink-0"
            />
          </div>
        </template>
      </div>

      <!-- No results -->
      <div v-else-if="hasQuery && !loading" class="flex flex-col items-center justify-center py-12">
        <Search class="h-10 w-10 text-gray-200 mb-3" />
        <p class="text-sm text-gray-400">No results found for "{{ query }}"</p>
        <p class="text-xs text-gray-300 mt-1">Try a different search term</p>
      </div>

      <!-- Empty state (no query, no recent) -->
      <div v-else class="flex flex-col items-center justify-center py-12">
        <Search class="h-10 w-10 text-gray-200 mb-3" />
        <p class="text-sm text-gray-400">Start typing to search</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center gap-4 border-t border-gray-200 px-4 py-2 text-xs text-gray-400">
      <span class="flex items-center gap-1">
        <kbd class="inline-flex items-center rounded border border-gray-300 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">&uarr;&darr;</kbd>
        navigate
      </span>
      <span class="flex items-center gap-1">
        <kbd class="inline-flex items-center rounded border border-gray-300 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">Enter</kbd>
        select
      </span>
      <span class="flex items-center gap-1">
        <kbd class="inline-flex items-center rounded border border-gray-300 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">Esc</kbd>
        close
      </span>
    </div>
  </a-modal>
</template>

<style scoped>
:deep(.command-palette-wrap .ant-modal-content) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

:deep(.command-palette-wrap .ant-modal-body) {
  padding: 0;
}
</style>
