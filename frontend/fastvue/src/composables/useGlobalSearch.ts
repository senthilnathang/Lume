/**
 * Global Search Composable
 *
 * Provides global search functionality across all models in the system.
 * Integrates with the backend search API.
 *
 * Usage:
 * ```ts
 * import { useGlobalSearch } from '#/composables';
 *
 * const { search, results, loading } = useGlobalSearch();
 *
 * // Perform search
 * await search('john');
 * ```
 */

import { computed, reactive } from 'vue';
import { useRouter } from 'vue-router';

import { requestClient } from '#/api/request';

export interface SearchResult {
  id: number;
  title: string;
  subtitle?: string;
  icon: string;
  route: string;
  type: string;
}

export interface SearchResponse {
  query: string;
  results: Record<string, SearchResult[]>;
  total_count: number;
}

export interface SearchableModel {
  name: string;
  icon: string;
  fields: string[];
}

interface GlobalSearchState {
  isOpen: boolean;
  query: string;
  results: Record<string, SearchResult[]>;
  totalCount: number;
  loading: boolean;
  error: string | null;
  selectedIndex: number;
  recentSearches: string[];
  availableModels: SearchableModel[];
}

// Global state
const state = reactive<GlobalSearchState>({
  isOpen: false,
  query: '',
  results: {},
  totalCount: 0,
  loading: false,
  error: null,
  selectedIndex: 0,
  recentSearches: [],
  availableModels: [],
});

// Debounce timer
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Load recent searches from localStorage
function loadRecentSearches(): void {
  try {
    const stored = localStorage.getItem('fastvue-recent-searches');
    if (stored) {
      state.recentSearches = JSON.parse(stored);
    }
  } catch {
    state.recentSearches = [];
  }
}

// Save recent searches to localStorage
function saveRecentSearches(): void {
  try {
    localStorage.setItem(
      'fastvue-recent-searches',
      JSON.stringify(state.recentSearches),
    );
  } catch {
    // Ignore storage errors
  }
}

// Add to recent searches
function addToRecentSearches(query: string): void {
  if (!query.trim()) return;
  state.recentSearches = [
    query,
    ...state.recentSearches.filter((q) => q !== query),
  ].slice(0, 10);
  saveRecentSearches();
}

/**
 * Open global search
 */
function open(): void {
  state.isOpen = true;
  state.query = '';
  state.results = {};
  state.totalCount = 0;
  state.selectedIndex = 0;
  state.error = null;
}

/**
 * Close global search
 */
function close(): void {
  state.isOpen = false;
  state.query = '';
  state.results = {};
  state.error = null;
}

/**
 * Toggle global search
 */
function toggle(): void {
  if (state.isOpen) {
    close();
  } else {
    open();
  }
}

/**
 * Set search query with optional debounce
 */
function setQuery(query: string, debounce = true): void {
  state.query = query;
  state.selectedIndex = 0;

  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  if (!query.trim() || query.length < 2) {
    state.results = {};
    state.totalCount = 0;
    return;
  }

  if (debounce) {
    searchDebounceTimer = setTimeout(() => {
      performSearch(query);
    }, 300);
  } else {
    performSearch(query);
  }
}

/**
 * Perform search API call
 */
async function performSearch(query: string): Promise<void> {
  if (!query.trim() || query.length < 2) {
    return;
  }

  state.loading = true;
  state.error = null;

  try {
    const response = await requestClient.get<SearchResponse>('/search', {
      params: {
        q: query,
        limit: 10,
      },
    });

    state.results = response.results;
    state.totalCount = response.total_count;
    addToRecentSearches(query);
  } catch (error: any) {
    console.error('Global search error:', error);
    state.error = error?.message || 'Search failed';
    state.results = {};
    state.totalCount = 0;
  } finally {
    state.loading = false;
  }
}

/**
 * Get flattened results for navigation
 */
function getFlattenedResults(): SearchResult[] {
  const results: SearchResult[] = [];
  for (const [, items] of Object.entries(state.results)) {
    results.push(...items);
  }
  return results;
}

/**
 * Navigate selection up/down
 */
function navigateSelection(direction: 'up' | 'down'): void {
  const flatResults = getFlattenedResults();
  if (flatResults.length === 0) return;

  if (direction === 'up') {
    state.selectedIndex = Math.max(0, state.selectedIndex - 1);
  } else {
    state.selectedIndex = Math.min(
      flatResults.length - 1,
      state.selectedIndex + 1,
    );
  }
}

/**
 * Set selected index
 */
function setSelectedIndex(index: number): void {
  state.selectedIndex = index;
}

/**
 * Navigate to selected result
 */
function navigateToSelected(): void {
  const flatResults = getFlattenedResults();
  if (flatResults[state.selectedIndex]) {
    navigateToResult(flatResults[state.selectedIndex]!);
  }
}

/**
 * Navigate to a specific result
 */
function navigateToResult(result: SearchResult): void {
  const router = useRouter();
  close();
  if (result.route) {
    router.push(result.route);
  }
}

/**
 * Fetch available searchable models
 */
async function fetchAvailableModels(): Promise<void> {
  try {
    const response =
      await requestClient.get<SearchableModel[]>('/search/models');
    state.availableModels = response;
  } catch (error) {
    console.error('Failed to fetch searchable models:', error);
  }
}

/**
 * Clear recent searches
 */
function clearRecentSearches(): void {
  state.recentSearches = [];
  localStorage.removeItem('fastvue-recent-searches');
}

/**
 * Get icon for model type
 */
function getModelIcon(type: string): string {
  const iconMap: Record<string, string> = {
    user: 'lucide:user',
    company: 'lucide:building',
    employee: 'lucide:users',
    department: 'lucide:git-branch',
    project: 'lucide:folder',
    task: 'lucide:check-square',
    course: 'lucide:book-open',
    quiz: 'lucide:help-circle',
    ticket: 'lucide:ticket',
    default: 'lucide:file',
  };
  return iconMap[type] || iconMap.default!;
}

/**
 * Get display name for model type
 */
function getModelDisplayName(type: string): string {
  const nameMap: Record<string, string> = {
    user: 'Users',
    company: 'Companies',
    employee: 'Employees',
    department: 'Departments',
    project: 'Projects',
    task: 'Tasks',
    course: 'Courses',
    quiz: 'Quizzes',
    ticket: 'Tickets',
  };
  return nameMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Global Search Composable
 */
export function useGlobalSearch() {
  // Load recent searches on first use
  if (state.recentSearches.length === 0) {
    loadRecentSearches();
  }

  const flattenedResults = computed(() => getFlattenedResults());

  return {
    // State
    isOpen: computed(() => state.isOpen),
    query: computed(() => state.query),
    results: computed(() => state.results),
    totalCount: computed(() => state.totalCount),
    loading: computed(() => state.loading),
    error: computed(() => state.error),
    selectedIndex: computed(() => state.selectedIndex),
    recentSearches: computed(() => state.recentSearches),
    availableModels: computed(() => state.availableModels),
    flattenedResults,

    // Methods
    open,
    close,
    toggle,
    setQuery,
    search: performSearch,
    navigateSelection,
    setSelectedIndex,
    navigateToSelected,
    navigateToResult,
    fetchAvailableModels,
    clearRecentSearches,

    // Helpers
    getModelIcon,
    getModelDisplayName,
  };
}

export default useGlobalSearch;
