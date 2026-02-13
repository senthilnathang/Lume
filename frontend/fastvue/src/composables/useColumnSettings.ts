import { ref, computed, type Ref, type ComputedRef } from 'vue';

// Types
export interface ColumnDefinition {
  key: string;
  title: string;
  dataIndex?: string;
  width?: number | string;
  fixed?: 'left' | 'right' | boolean;
  sorter?: boolean;
  required?: boolean; // Cannot be hidden
  defaultVisible?: boolean;
  [key: string]: any; // Allow additional column properties
}

export interface ColumnConfig {
  key: string;
  title: string;
  visible: boolean;
  fixed?: 'left' | 'right' | boolean;
  required?: boolean;
  width?: number | string;
}

export interface UseColumnSettingsOptions {
  storageKey?: string;
  defaultVisible?: boolean;
}

export interface UseColumnSettingsReturn {
  columnConfigs: Ref<ColumnConfig[]>;
  visibleColumns: ComputedRef<ColumnDefinition[]>;
  visibleCount: ComputedRef<number>;
  totalCount: ComputedRef<number>;
  updateColumns: (configs: ColumnConfig[]) => void;
  toggleColumn: (key: string) => void;
  showColumn: (key: string) => void;
  hideColumn: (key: string) => void;
  showAllColumns: () => void;
  hideAllColumns: () => void;
  resetColumns: () => void;
  moveColumn: (fromIndex: number, toIndex: number) => void;
  isColumnVisible: (key: string) => boolean;
}

/**
 * Composable for managing table column visibility and order
 */
export function useColumnSettings(
  columns: ColumnDefinition[],
  options: UseColumnSettingsOptions = {}
): UseColumnSettingsReturn {
  const { storageKey, defaultVisible = true } = options;

  // Initialize column configs
  const initializeConfigs = (): ColumnConfig[] => {
    let configs: ColumnConfig[] = columns.map((col) => ({
      key: col.key,
      title: col.title || col.key,
      visible: col.defaultVisible ?? defaultVisible,
      fixed: col.fixed,
      required: col.required,
      width: col.width,
    }));

    // Load from storage if available
    if (storageKey) {
      const stored = loadFromStorage(storageKey);
      if (stored) {
        configs = mergeWithStored(configs, stored);
      }
    }

    return configs;
  };

  const columnConfigs = ref<ColumnConfig[]>(initializeConfigs());

  // Original columns reference for reset
  const originalColumns = [...columns];

  // Computed visible columns with proper order and properties
  const visibleColumns = computed<ColumnDefinition[]>(() => {
    const visibleConfigs = columnConfigs.value.filter((c) => c.visible);

    return visibleConfigs.map((config) => {
      const original = originalColumns.find((c) => c.key === config.key);
      if (!original) {
        return {
          key: config.key,
          title: config.title,
          width: config.width,
          fixed: config.fixed,
        };
      }

      return {
        ...original,
        // Preserve fixed from config if it was modified
        fixed: config.fixed ?? original.fixed,
      };
    });
  });

  const visibleCount = computed(() =>
    columnConfigs.value.filter((c) => c.visible).length
  );

  const totalCount = computed(() => columnConfigs.value.length);

  // Helper functions
  function loadFromStorage(key: string): { key: string; visible: boolean; order: number }[] | null {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  function saveToStorage() {
    if (!storageKey) return;

    const data = columnConfigs.value.map((c, index) => ({
      key: c.key,
      visible: c.visible,
      order: index,
    }));
    localStorage.setItem(storageKey, JSON.stringify(data));
  }

  function mergeWithStored(
    configs: ColumnConfig[],
    stored: { key: string; visible: boolean; order: number }[]
  ): ColumnConfig[] {
    const storedMap = new Map(stored.map((s) => [s.key, s]));

    // Apply stored visibility
    configs.forEach((config) => {
      const storedConfig = storedMap.get(config.key);
      if (storedConfig && !config.required) {
        config.visible = storedConfig.visible;
      }
    });

    // Sort by stored order
    configs.sort((a, b) => {
      const aOrder = storedMap.get(a.key)?.order ?? 999;
      const bOrder = storedMap.get(b.key)?.order ?? 999;
      return aOrder - bOrder;
    });

    return configs;
  }

  // Public methods
  function updateColumns(configs: ColumnConfig[]) {
    columnConfigs.value = configs;
    saveToStorage();
  }

  function toggleColumn(key: string) {
    const config = columnConfigs.value.find((c) => c.key === key);
    if (config && !config.required) {
      config.visible = !config.visible;
      saveToStorage();
    }
  }

  function showColumn(key: string) {
    const config = columnConfigs.value.find((c) => c.key === key);
    if (config) {
      config.visible = true;
      saveToStorage();
    }
  }

  function hideColumn(key: string) {
    const config = columnConfigs.value.find((c) => c.key === key);
    if (config && !config.required) {
      config.visible = false;
      saveToStorage();
    }
  }

  function showAllColumns() {
    columnConfigs.value.forEach((config) => {
      config.visible = true;
    });
    saveToStorage();
  }

  function hideAllColumns() {
    columnConfigs.value.forEach((config) => {
      if (!config.required) {
        config.visible = false;
      }
    });
    saveToStorage();
  }

  function resetColumns() {
    columnConfigs.value = columns.map((col) => ({
      key: col.key,
      title: col.title || col.key,
      visible: col.defaultVisible ?? defaultVisible,
      fixed: col.fixed,
      required: col.required,
      width: col.width,
    }));

    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  }

  function moveColumn(fromIndex: number, toIndex: number) {
    if (
      fromIndex < 0 ||
      fromIndex >= columnConfigs.value.length ||
      toIndex < 0 ||
      toIndex >= columnConfigs.value.length
    ) {
      return;
    }

    const item = columnConfigs.value.splice(fromIndex, 1)[0];
    if (item) {
      columnConfigs.value.splice(toIndex, 0, item);
      saveToStorage();
    }
  }

  function isColumnVisible(key: string): boolean {
    return columnConfigs.value.find((c) => c.key === key)?.visible ?? false;
  }

  return {
    columnConfigs,
    visibleColumns,
    visibleCount,
    totalCount,
    updateColumns,
    toggleColumn,
    showColumn,
    hideColumn,
    showAllColumns,
    hideAllColumns,
    resetColumns,
    moveColumn,
    isColumnVisible,
  };
}

/**
 * Helper to create column definitions with common defaults
 */
export function defineColumns(
  columns: Array<{
    key: string;
    title: string;
    dataIndex?: string;
    width?: number | string;
    fixed?: 'left' | 'right' | boolean;
    sorter?: boolean;
    required?: boolean;
    defaultVisible?: boolean;
    [key: string]: any;
  }>
): ColumnDefinition[] {
  return columns.map((col) => ({
    ...col,
    title: col.title,
    key: col.key,
    dataIndex: col.dataIndex || col.key,
    defaultVisible: col.defaultVisible ?? true,
  }));
}
