export type ViewMode = 'card' | 'grid' | 'list';

export interface CardGridViewProps<T = any> {
  /** Data items to display */
  items: T[];
  /** Loading state */
  loading?: boolean;
  /** Current view mode */
  viewMode?: ViewMode;
  /** Number of columns for grid mode (responsive object or fixed number) */
  gridCols?: number | { xs?: number; sm?: number; md?: number; lg?: number; xl?: number; xxl?: number };
  /** Gap between items in pixels */
  gap?: number;
  /** Unique key field for each item */
  rowKey?: string | ((item: T) => string | number);
  /** Whether to show view mode toggle buttons */
  showViewToggle?: boolean;
  /** Available view modes to toggle between */
  availableModes?: ViewMode[];
  /** Empty state text */
  emptyText?: string;
  /** Card min width in pixels (for auto-fit grid) */
  cardMinWidth?: number;
  /** Card max width in pixels */
  cardMaxWidth?: number;
}

export interface CardGridViewEmits<T = any> {
  (e: 'update:viewMode', mode: ViewMode): void;
  (e: 'itemClick', item: T): void;
}

export interface CardGridViewSlots<T = any> {
  /** Card content slot */
  card?: (props: { item: T; index: number }) => any;
  /** Grid item content slot */
  gridItem?: (props: { item: T; index: number }) => any;
  /** List item content slot */
  listItem?: (props: { item: T; index: number }) => any;
  /** Custom empty state */
  empty?: () => any;
  /** Header slot with view toggle */
  header?: (props: { viewMode: ViewMode; toggleView: (mode: ViewMode) => void }) => any;
  /** Actions slot per item */
  actions?: (props: { item: T; index: number }) => any;
}
