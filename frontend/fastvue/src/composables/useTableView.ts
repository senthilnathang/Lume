import { ref, computed, type Ref, type ComputedRef } from 'vue';

export type ViewMode = 'list' | 'card';

export interface UseTableViewOptions {
  defaultView?: ViewMode;
  cardPageSize?: number;
  listPageSize?: number;
}

export interface UseTableViewReturn {
  viewMode: Ref<ViewMode>;
  isListView: ComputedRef<boolean>;
  isCardView: ComputedRef<boolean>;
  toggleViewMode: (mode: ViewMode) => void;
  getPageSize: () => number;
}

export function useTableView(options: UseTableViewOptions = {}): UseTableViewReturn {
  const {
    defaultView = 'list',
    cardPageSize = 100,
    listPageSize = 20,
  } = options;

  const viewMode = ref<ViewMode>(defaultView);

  const isListView = computed(() => viewMode.value === 'list');
  const isCardView = computed(() => viewMode.value === 'card');

  function toggleViewMode(mode: ViewMode) {
    viewMode.value = mode;
  }

  function getPageSize() {
    return viewMode.value === 'card' ? cardPageSize : listPageSize;
  }

  return {
    viewMode,
    isListView,
    isCardView,
    toggleViewMode,
    getPageSize,
  };
}
