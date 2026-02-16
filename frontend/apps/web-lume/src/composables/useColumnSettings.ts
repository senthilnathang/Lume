import { ref, computed, watch } from 'vue';

export interface Column {
  key: string;
  title: string;
  dataIndex?: string;
  visible?: boolean;
  [key: string]: any;
}

interface StoredColumnState {
  key: string;
  visible: boolean;
}

function getStorageKey(viewKey: string): string {
  return `lume_columns_${viewKey}`;
}

function loadState(viewKey: string): StoredColumnState[] | null {
  try {
    const raw = localStorage.getItem(getStorageKey(viewKey));
    if (!raw) return null;
    return JSON.parse(raw) as StoredColumnState[];
  } catch {
    return null;
  }
}

function saveState(viewKey: string, columns: StoredColumnState[]): void {
  localStorage.setItem(
    getStorageKey(viewKey),
    JSON.stringify(columns)
  );
}

export function useColumnSettings(viewKey: string, defaultColumns: Column[]) {
  const showSettings = ref(false);

  // Initialize columns from defaults, then apply any saved state
  const allColumns = ref<Column[]>(initColumns());

  function initColumns(): Column[] {
    const saved = loadState(viewKey);
    if (!saved || saved.length === 0) {
      return defaultColumns.map(col => ({
        ...col,
        visible: col.visible !== false,
      }));
    }

    // Build a lookup from saved state for order and visibility
    const savedMap = new Map(saved.map((s, i) => [s.key, { visible: s.visible, order: i }]));

    // Start with saved columns in their saved order, matched to defaults for full column data
    const defaultMap = new Map(defaultColumns.map(col => [col.key, col]));
    const result: Column[] = [];

    // First add columns in saved order
    for (const s of saved) {
      const def = defaultMap.get(s.key);
      if (def) {
        result.push({ ...def, visible: s.visible });
      }
    }

    // Then append any new columns not present in saved state
    for (const col of defaultColumns) {
      if (!savedMap.has(col.key)) {
        result.push({ ...col, visible: col.visible !== false });
      }
    }

    return result;
  }

  const visibleColumns = computed(() =>
    allColumns.value.filter(col => col.visible !== false)
  );

  // Persist whenever columns change
  watch(
    allColumns,
    (cols) => {
      const state: StoredColumnState[] = cols.map(col => ({
        key: col.key,
        visible: col.visible !== false,
      }));
      saveState(viewKey, state);
    },
    { deep: true }
  );

  function toggleColumn(key: string): void {
    const col = allColumns.value.find(c => c.key === key);
    if (col) {
      col.visible = col.visible === false ? true : false;
    }
  }

  function moveColumn(key: string, direction: 'up' | 'down'): void {
    const index = allColumns.value.findIndex(c => c.key === key);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= allColumns.value.length) return;

    const cols = [...allColumns.value];
    const [removed] = cols.splice(index, 1);
    cols.splice(targetIndex, 0, removed);
    allColumns.value = cols;
  }

  function resetColumns(): void {
    allColumns.value = defaultColumns.map(col => ({
      ...col,
      visible: col.visible !== false,
    }));
    localStorage.removeItem(getStorageKey(viewKey));
  }

  return {
    visibleColumns,
    allColumns,
    toggleColumn,
    moveColumn,
    resetColumns,
    showSettings,
  };
}
