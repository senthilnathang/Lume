import { ref, type Ref } from 'vue';

import type {
  KanbanColumn,
  KanbanFilter,
  KanbanItem,
  KanbanMoveEvent,
  KanbanSort,
} from './types';

export interface UseKanbanOptions<T extends KanbanItem> {
  columns: KanbanColumn<T>[];
  statusField?: string;
  onMove?: (event: KanbanMoveEvent<T>) => void | Promise<void>;
}

export interface UseKanbanReturn<T extends KanbanItem> {
  columns: Ref<KanbanColumn<T>[]>;
  filters: Ref<KanbanFilter[]>;
  sort: Ref<KanbanSort | null>;
  loading: Ref<boolean>;

  // Methods
  addItem: (item: T, columnId: string | number) => void;
  removeItem: (itemId: string | number) => T | undefined;
  moveItem: (itemId: string | number, toColumnId: string | number, toIndex?: number) => void;
  updateItem: (itemId: string | number, updates: Partial<T>) => void;
  findItem: (itemId: string | number) => { item: T; column: KanbanColumn<T>; index: number } | undefined;
  getColumnItems: (columnId: string | number) => T[];
  setColumnItems: (columnId: string | number, items: T[]) => void;
  clearColumn: (columnId: string | number) => void;
  toggleColumnCollapse: (columnId: string | number) => void;
  applyFilter: (filter: KanbanFilter) => void;
  clearFilters: () => void;
  setSort: (sort: KanbanSort | null) => void;
  handleMove: (event: KanbanMoveEvent<T>) => Promise<void>;
}

export function useKanban<T extends KanbanItem>(
  options: UseKanbanOptions<T>
): UseKanbanReturn<T> {
  const columns = ref<KanbanColumn<T>[]>(options.columns) as Ref<KanbanColumn<T>[]>;
  const filters = ref<KanbanFilter[]>([]);
  const sort = ref<KanbanSort | null>(null);
  const loading = ref(false);

  const statusField = options.statusField || 'status';

  // Find item across all columns
  function findItem(itemId: string | number) {
    for (const column of columns.value) {
      const index = column.items.findIndex(item => item.id === itemId);
      if (index !== -1) {
        return { item: column.items[index] as T, column, index };
      }
    }
    return undefined;
  }

  // Add item to a column
  function addItem(item: T, columnId: string | number) {
    const column = columns.value.find(c => c.id === columnId);
    if (column) {
      column.items.push(item);
    }
  }

  // Remove item from any column
  function removeItem(itemId: string | number): T | undefined {
    for (const column of columns.value) {
      const index = column.items.findIndex(item => item.id === itemId);
      if (index !== -1) {
        const [removed] = column.items.splice(index, 1);
        return removed as T;
      }
    }
    return undefined;
  }

  // Move item between columns
  function moveItem(itemId: string | number, toColumnId: string | number, toIndex?: number) {
    const found = findItem(itemId);
    if (!found) return;

    const { item, column: fromColumn, index: fromIndex } = found;
    const toColumn = columns.value.find(c => c.id === toColumnId);
    if (!toColumn) return;

    // Remove from source
    fromColumn.items.splice(fromIndex, 1);

    // Add to destination
    const insertIndex = toIndex !== undefined ? toIndex : toColumn.items.length;
    toColumn.items.splice(insertIndex, 0, item);

    // Update status field if configured
    if (statusField && item) {
      (item as any)[statusField] = toColumnId;
    }
  }

  // Update item properties
  function updateItem(itemId: string | number, updates: Partial<T>) {
    const found = findItem(itemId);
    if (found) {
      Object.assign(found.item, updates);

      // If status changed, move to appropriate column
      if (statusField && updates[statusField as keyof T] !== undefined) {
        const newColumnId = updates[statusField as keyof T] as string | number;
        if (found.column.id !== newColumnId) {
          moveItem(itemId, newColumnId);
        }
      }
    }
  }

  // Get items in a column
  function getColumnItems(columnId: string | number): T[] {
    const column = columns.value.find(c => c.id === columnId);
    return (column?.items || []) as T[];
  }

  // Set items in a column
  function setColumnItems(columnId: string | number, items: T[]) {
    const column = columns.value.find(c => c.id === columnId);
    if (column) {
      column.items = items;
    }
  }

  // Clear all items in a column
  function clearColumn(columnId: string | number) {
    const column = columns.value.find(c => c.id === columnId);
    if (column) {
      column.items = [];
    }
  }

  // Toggle column collapse state
  function toggleColumnCollapse(columnId: string | number) {
    const column = columns.value.find(c => c.id === columnId);
    if (column) {
      column.collapsed = !column.collapsed;
    }
  }

  // Apply filter
  function applyFilter(filter: KanbanFilter) {
    const existingIndex = filters.value.findIndex(f => f.field === filter.field);
    if (existingIndex >= 0) {
      filters.value[existingIndex] = filter;
    } else {
      filters.value.push(filter);
    }
  }

  // Clear all filters
  function clearFilters() {
    filters.value = [];
  }

  // Set sort
  function setSort(newSort: KanbanSort | null) {
    sort.value = newSort;
  }

  // Handle move event (with optional API call)
  async function handleMove(event: KanbanMoveEvent<T>) {
    loading.value = true;
    try {
      // Perform local move
      moveItem(event.item.id, event.toColumn, event.toIndex);

      // Call external handler if provided
      if (options.onMove) {
        await options.onMove(event);
      }
    } finally {
      loading.value = false;
    }
  }

  return {
    columns,
    filters,
    sort,
    loading,
    addItem,
    removeItem,
    moveItem,
    updateItem,
    findItem,
    getColumnItems,
    setColumnItems,
    clearColumn,
    toggleColumnCollapse,
    applyFilter,
    clearFilters,
    setSort,
    handleMove,
  };
}
