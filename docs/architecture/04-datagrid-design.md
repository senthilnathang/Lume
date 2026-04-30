# Datagrid Design (Primary UI Layer)

## Overview

The DataGrid is the primary user-facing component for displaying, filtering, sorting, and editing entity collections in the Lume framework. It serves as a powerful bridge between the backend unified runtime and the frontend presentation layer, providing real-time updates, inline editing, saved views, and advanced data management capabilities.

**Core Purpose**: Transform runtime-generated entity schemas and query results into an interactive, feature-rich data display and management interface.

**Key Principles**:
- **State-driven**: All grid behavior (filters, sort, pagination) derives from a serializable GridState
- **Backend-integrated**: Filter/sort/pagination delegated to runtime via Drizzle/Prisma queries
- **Real-time capable**: WebSocket-driven updates reflect data changes without page refresh
- **Editable**: Cell-level editing with validation tied to entity field rules
- **Extensible**: Column renderers and editors pluggable for custom data types
- **Permission-aware**: Column visibility and edit capability tied to RBAC rules

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
│                    (Vue 3 / Nuxt 3)                             │
└─────────────────────────────────────────────────────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  GridState   │  │  DataGrid    │  │  Renderers   │
    │  Management  │  │  Component   │  │  & Editors   │
    │              │  │              │  │              │
    │ - Filters    │  │ - Layout     │  │ - Text       │
    │ - Sort       │  │ - Event emit │  │ - Date       │
    │ - Pagination │  │ - Hooks      │  │ - Reference  │
    │ - Selection  │  │              │  │ - Boolean    │
    └──────────────┘  └──────────────┘  └──────────────┘
            │                  │                  │
            └──────────────────┼──────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  useDataGrid │  │   WebSocket  │  │  Real-Time   │
    │  Composable  │  │  Listener    │  │  Updates     │
    │              │  │              │  │              │
    │ - Fetch data │  │ - Entity:*   │  │ - Insert row │
    │ - Translate  │  │   events     │  │ - Update row │
    │   state      │  │ - Subscribe  │  │ - Delete row │
    │ - Cache mgmt │  │   logic      │  │ - Refresh    │
    └──────────────┘  └──────────────┘  └──────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
┌──────────────────────────────────────────────────────────┐
│                    Backend Runtime                       │
│          (Entity Subsystem & Query Engine)               │
└──────────────────────────────────────────────────────────┘
            │                  │                  │
            ▼                  ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Filter       │  │ Sort Engine  │  │ Pagination   │
    │ Translator   │  │              │  │              │
    │              │  │ Translates:  │  │ offset/limit │
    │ GridState    │  │ GridSort →   │  │              │
    │ conditions → │  │ Drizzle .    │  │ Calculated   │
    │ Drizzle      │  │ orderBy()    │  │ from state   │
    │ where()      │  │              │  │              │
    └──────────────┘  └──────────────┘  └──────────────┘
            │                  │                  │
            └──────────────────┼──────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  Drizzle     │  │   Prisma     │  │  Database    │
    │  Queries     │  │  Queries     │  │              │
    │              │  │              │  │  MySQL       │
    │  (Module     │  │  (Core       │  │              │
    │   tables)    │  │   models)    │  │              │
    └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 1. Grid State Model

### TypeScript Interfaces

The GridState represents the complete, serializable configuration of a data grid. It can be persisted to saved views, cached, or transmitted to the backend.

```typescript
/**
 * Complete grid configuration and state.
 * Serializable and restorable for saved views.
 */
export interface GridState {
  // Identity
  entityName: string;              // e.g. 'support:ticket', 'crm:contact'
  viewId?: string;                 // Active saved view ID (if any)

  // Column configuration
  columns: GridColumn[];            // Visible columns + order
  columnWidths: Record<string, number>;  // Column width overrides

  // Filtering
  filters: FilterCondition[];       // Active filter conditions
  filterMode: 'and' | 'or';        // Combine filters with AND or OR
  filterGroups?: FilterGroup[];     // Nested filter groups (for complex logic)

  // Sorting
  sort: GridSort[];                 // Multi-column sort specification
  // Example: [{ field: 'createdAt', direction: 'desc' }, { field: 'name', direction: 'asc' }]

  // Grouping (optional)
  groupBy?: GridGrouping;           // Group rows by field values

  // Pagination
  pagination: GridPagination;       // Offset, limit, total count

  // Selection
  selectedRows: (string | number)[]; // IDs of selected rows

  // Display options
  displayOptions: {
    rowHeight?: number;             // Custom row height
    stripedRows?: boolean;          // Alternate row colors
    showHeaderFilters?: boolean;    // Filter inputs in header row
    densityMode?: 'compact' | 'comfortable' | 'spacious';
    virtualized?: boolean;          // Virtual scrolling for large datasets
  };

  // Saved view references
  savedViews?: SavedView[];         // Available saved views for this entity

  // Advanced
  metadata?: {
    lastUpdated?: string;           // ISO timestamp
    userId?: string;                // Who last modified this state
    correlationId?: string;         // Trace back to operation
  };
}

/**
 * Column configuration.
 */
export interface GridColumn {
  // Identity
  field: string;                    // Entity field name (dot notation for nested)
  id?: string;                      // Unique column ID (defaults to field)

  // Display
  label: string;                    // Header text
  description?: string;             // Hover tooltip

  // Data type & rendering
  type: ColumnType;                 // 'text' | 'number' | 'date' | 'boolean' | 'reference' | 'select' | 'currency' | 'percent' | 'custom'
  format?: string;                  // For dates: 'DD/MM/YYYY', numbers: '0,0.00'
  renderFn?: (value: any, row: any, context: GridRenderContext) => string | VNode;

  // Interaction
  sortable?: boolean;               // Allow sorting on this column
  filterable?: boolean;             // Show filter control
  editable?: boolean;               // Allow inline edit
  hideable?: boolean;               // User can toggle column visibility
  frozen?: boolean;                 // Fixed left (don't scroll horizontally)

  // Sizing
  width?: number;                   // Column width in pixels (or flex: 1)
  minWidth?: number;                // Minimum width
  maxWidth?: number;                // Maximum width
  flex?: number;                    // Flex grow factor

  // Editing
  editComponent?: string;           // Editor component name ('text', 'date', 'select', 'custom')
  editProps?: Record<string, any>;  // Props to pass to editor
  validateFn?: (value: any, row: any) => string | null;  // Validation function, returns error msg or null

  // Permissions
  readableByRoles?: string[];       // RBAC: visible if user has role
  editableByRoles?: string[];       // RBAC: editable if user has role

  // Visibility
  visible?: boolean;                // Column shown/hidden
  pinned?: 'left' | 'right' | null; // Pin column to side
}

/**
 * Column types supported by DataGrid.
 */
export type ColumnType =
  | 'text'           // String, rendered as text
  | 'number'         // Numeric, right-aligned
  | 'currency'       // Number with currency symbol
  | 'percent'        // Number as percentage
  | 'date'           // ISO date, formatted for display
  | 'datetime'       // ISO datetime
  | 'boolean'        // Checkbox or yes/no
  | 'select'         // Dropdown with predefined options
  | 'reference'      // Foreign key, shows related entity display field
  | 'array'          // Array of values, comma-separated or badge group
  | 'json'           // JSON preview (collapsible)
  | 'rich-text'      // Rich text / HTML preview
  | 'custom';        // Custom renderer function

/**
 * Filter condition.
 */
export interface FilterCondition {
  id?: string;                       // Unique ID for UI updates
  field: string;                     // Entity field name
  operator: FilterOperator;          // Comparison operator
  value: any;                        // Filter value(s)
  caseSensitive?: boolean;           // For string comparisons
  not?: boolean;                     // Negate the condition
}

/**
 * Filter operators supported by DataGrid → Runtime.
 */
export type FilterOperator =
  | '='                // Equals
  | '!='               // Not equals
  | '>'                // Greater than
  | '<'                // Less than
  | '>='               // Greater or equal
  | '<='               // Less or equal
  | 'in'               // Value in array
  | 'nin'              // Value not in array
  | 'like'             // String contains (case-insensitive by default)
  | 'between'          // Range: value is [min, max]
  | 'empty'            // Field is null/undefined/empty string
  | 'nempty'           // Field is not empty
  | 'contains'         // Array field contains value
  | 'ncontains'        // Array field doesn't contain value
  | 'startswith'       // String starts with
  | 'endswith';        // String ends with

/**
 * Nested filter groups for complex conditions.
 */
export interface FilterGroup {
  id?: string;
  mode: 'and' | 'or';
  conditions: (FilterCondition | FilterGroup)[];
}

/**
 * Sort specification for multiple columns.
 */
export interface GridSort {
  field: string;                    // Entity field name
  direction: 'asc' | 'desc';       // Sort direction
  priority?: number;                // Order of precedence (lower = higher priority)
}

/**
 * Grouping configuration.
 */
export interface GridGrouping {
  field: string;                    // Field to group by
  direction?: 'asc' | 'desc';      // Sort groups
  aggregates?: GridAggregate[];     // Aggregations to show per group
}

/**
 * Aggregate function for grouped rows.
 */
export interface GridAggregate {
  field: string;                    // Field to aggregate
  function: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'distinct';
  label?: string;
  format?: string;
}

/**
 * Pagination state.
 */
export interface GridPagination {
  currentPage: number;              // 1-indexed
  pageSize: number;                 // Rows per page
  totalCount: number;               // Total matching rows
  totalPages?: number;              // Calculated
  offset?: number;                  // Calculated: (currentPage - 1) * pageSize
  limit?: number;                   // Calculated: pageSize
}

/**
 * Saved view (persisted grid configuration).
 */
export interface SavedView {
  id: string;                       // Unique view ID
  name: string;                     // Display name
  description?: string;
  entityName: string;               // Entity this view is for
  columns: GridColumn[];            // Saved columns
  filters: FilterCondition[];       // Saved filters
  sort: GridSort[];                 // Saved sort
  groupBy?: GridGrouping;           // Saved grouping
  createdBy: string;                // User ID who created
  createdAt: string;                // ISO timestamp
  updatedAt: string;
  shared?: boolean;                 // Shared with all users
  sharedWith?: string[];            // User IDs if selectively shared
  isDefault?: boolean;              // Default view for this entity
}

/**
 * Render context passed to custom renderers.
 */
export interface GridRenderContext {
  row: any;                         // Complete row data
  column: GridColumn;               // Column config
  rowIndex: number;                 // 0-based row index
  isEditing?: boolean;              // Row in edit mode
  isSelected?: boolean;             // Row selected
}
```

---

## 2. Backend Query Integration

### Filter Translation

The filter translator converts GridState filter conditions into Drizzle/Prisma query clauses. This runs on the backend before database execution, ensuring consistency and security.

```typescript
/**
 * Backend: Translate GridState filters → Drizzle/Prisma queries.
 * 
 * This service runs on the backend and converts GridState filter
 * conditions into ORM-specific query syntax.
 */
export class FilterTranslator {
  /**
   * Translate GridState filters to Drizzle where conditions.
   * @param filters - GridState filter array
   * @param schema - Drizzle schema object
   * @returns Drizzle where() condition
   */
  static translateToDrizzle(
    filters: FilterCondition[],
    schema: any
  ): any {
    if (!filters || filters.length === 0) {
      return undefined;
    }

    const conditions = filters.map(filter =>
      this.conditionToDrizzleClause(filter, schema)
    );

    // Combine with AND (default)
    return and(...conditions);
  }

  /**
   * Translate single filter condition to Drizzle clause.
   */
  private static conditionToDrizzleClause(
    condition: FilterCondition,
    schema: any
  ): any {
    const { field, operator, value, caseSensitive, not } = condition;
    const column = this.getSchemaColumn(field, schema);

    let clause: any;

    switch (operator) {
      case '=':
        clause = eq(column, value);
        break;
      case '!=':
        clause = ne(column, value);
        break;
      case '>':
        clause = gt(column, value);
        break;
      case '<':
        clause = lt(column, value);
        break;
      case '>=':
        clause = gte(column, value);
        break;
      case '<=':
        clause = lte(column, value);
        break;
      case 'in':
        clause = inArray(column, value);
        break;
      case 'nin':
        clause = notInArray(column, value);
        break;
      case 'like':
        // SQL LIKE with % wildcards
        clause = like(
          column,
          `%${value}%`,
          caseSensitive ? undefined : { escape: '\\' }
        );
        break;
      case 'between':
        // value = [min, max]
        clause = and(
          gte(column, value[0]),
          lte(column, value[1])
        );
        break;
      case 'empty':
        clause = isNull(column);
        break;
      case 'nempty':
        clause = isNotNull(column);
        break;
      case 'startswith':
        clause = like(column, `${value}%`);
        break;
      case 'endswith':
        clause = like(column, `%${value}`);
        break;
      default:
        throw new Error(`Unknown filter operator: ${operator}`);
    }

    // Apply NOT modifier if needed
    return not ? not(clause) : clause;
  }

  /**
   * Get Drizzle column from schema by dot-notation field.
   * Handles nested references (e.g. 'assignedAgent.department').
   */
  private static getSchemaColumn(field: string, schema: any): any {
    const parts = field.split('.');
    let current = schema;

    for (const part of parts) {
      if (!current[part]) {
        throw new Error(`Field not found in schema: ${field}`);
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Translate to Prisma query (for core models).
   */
  static translateToPrisma(filters: FilterCondition[]): any {
    if (!filters || filters.length === 0) {
      return {};
    }

    const where: any = {};

    for (const filter of filters) {
      const { field, operator, value, not } = filter;

      let condition: any;

      switch (operator) {
        case '=':
          condition = value;
          break;
        case '!=':
          condition = { not: value };
          break;
        case '>':
          condition = { gt: value };
          break;
        case '<':
          condition = { lt: value };
          break;
        case '>=':
          condition = { gte: value };
          break;
        case '<=':
          condition = { lte: value };
          break;
        case 'in':
          condition = { in: value };
          break;
        case 'nin':
          condition = { notIn: value };
          break;
        case 'like':
          condition = { contains: value, mode: 'insensitive' };
          break;
        case 'between':
          condition = { gte: value[0], lte: value[1] };
          break;
        case 'empty':
          condition = null;
          break;
        case 'nempty':
          condition = { not: null };
          break;
        default:
          throw new Error(`Unknown filter operator: ${operator}`);
      }

      where[field] = not ? { not: condition } : condition;
    }

    return where;
  }
}

/**
 * Example usage in backend entity query service:
 */
export class EntityQueryService {
  async queryEntities(
    entityName: string,
    gridState: GridState
  ): Promise<{ rows: any[]; total: number }> {
    const entity = RuntimeRegistry.entity(entityName);
    const schema = this.getSchema(entityName);

    // Translate filters
    const whereClause = FilterTranslator.translateToDrizzle(
      gridState.filters,
      schema
    );

    // Translate sort
    const orderByClause = this.translateSort(gridState.sort, schema);

    // Calculate offset/limit
    const offset = (gridState.pagination.currentPage - 1) * gridState.pagination.pageSize;
    const limit = gridState.pagination.pageSize;

    // Execute query
    const rows = await db
      .select()
      .from(schema)
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(schema)
      .where(whereClause);
    const total = countResult[0]?.count || 0;

    // Eager load references if needed
    const enriched = await this.eagerLoadReferences(rows, entity);

    return { rows: enriched, total };
  }

  private translateSort(sorts: GridSort[], schema: any): any[] {
    return sorts
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
      .map(sort => {
        const column = this.getSchemaColumn(sort.field, schema);
        return sort.direction === 'asc'
          ? asc(column)
          : desc(column);
      });
  }

  private async eagerLoadReferences(
    rows: any[],
    entity: EntityDefinition
  ): Promise<any[]> {
    // For reference fields, fetch related entity data
    const references = entity.fields.filter(f => f.type === 'reference');

    for (const ref of references) {
      const relatedIds = [...new Set(rows.map(r => r[ref.name]))].filter(Boolean);
      if (relatedIds.length === 0) continue;

      const relatedSchema = this.getSchema(ref.referenceEntity);
      const related = await db
        .select()
        .from(relatedSchema)
        .where(inArray(relatedSchema.id, relatedIds));

      const relatedMap = new Map(related.map(r => [r.id, r]));

      rows = rows.map(row => ({
        ...row,
        [ref.name]: relatedMap.get(row[ref.name])
      }));
    }

    return rows;
  }
}
```

### Sorting & Pagination

```typescript
/**
 * Translate GridSort array to Drizzle/Prisma orderBy.
 */
export function translateSort(
  sorts: GridSort[],
  schema: any
): any[] {
  if (!sorts || sorts.length === 0) {
    return [asc(schema.id)]; // Default: sort by ID ascending
  }

  return sorts
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    .map(sort => {
      const column = getSchemaColumn(sort.field, schema);
      return sort.direction === 'asc'
        ? asc(column)
        : desc(column);
    });
}

/**
 * Pagination calculation.
 */
export function calculatePagination(state: GridState): {
  offset: number;
  limit: number;
} {
  const { currentPage, pageSize } = state.pagination;
  return {
    offset: (currentPage - 1) * pageSize,
    limit: pageSize
  };
}

/**
 * Update pagination after query.
 */
export function updatePaginationState(
  state: GridState,
  totalCount: number
): GridState {
  const totalPages = Math.ceil(totalCount / state.pagination.pageSize);
  return {
    ...state,
    pagination: {
      ...state.pagination,
      totalCount,
      totalPages,
      offset: (state.pagination.currentPage - 1) * state.pagination.pageSize,
      limit: state.pagination.pageSize
    }
  };
}
```

---

## 3. Vue 3 Component Architecture

### DataGrid Component

The main component that orchestrates grid rendering, state management, and event handling.

```vue
<template>
  <div class="data-grid" :class="densityClasses">
    <!-- Toolbar -->
    <div class="grid-toolbar" v-if="showToolbar">
      <div class="toolbar-left">
        <a-button
          type="primary"
          @click="$emit('add')"
          v-if="canCreate"
        >
          <template #icon>
            <PlusIcon size="16" />
          </template>
          Add {{ entityLabel }}
        </a-button>

        <a-button
          danger
          @click="deleteSelected"
          v-if="selectedRows.length > 0 && canDelete"
          :loading="deleting"
        >
          Delete ({{ selectedRows.length }})
        </a-button>

        <a-popover v-if="savedViews.length > 0">
          <template #content>
            <div class="saved-views-list">
              <div
                v-for="view in savedViews"
                :key="view.id"
                class="saved-view-item"
                @click="loadSavedView(view)"
              >
                <div class="view-name">{{ view.name }}</div>
                <div class="view-desc" v-if="view.description">
                  {{ view.description }}
                </div>
              </div>
            </div>
          </template>
          <a-button>
            Saved Views
            <template #icon>
              <DownloadIcon size="16" />
            </template>
          </a-button>
        </a-popover>
      </div>

      <div class="toolbar-right">
        <a-input-search
          v-model:value="quickSearchQuery"
          placeholder="Quick search..."
          @search="applyQuickSearch"
          :loading="loading"
          style="width: 200px"
        />

        <a-dropdown>
          <template #overlay>
            <a-menu @click="handleMenuClick">
              <a-menu-item key="save-view">
                <SaveIcon size="16" />
                Save as View
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item key="export-csv">
                <DownloadIcon size="16" />
                Export CSV
              </a-menu-item>
              <a-menu-item key="export-json">
                <DownloadIcon size="16" />
                Export JSON
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item key="toggle-filters">
                {{ showFilters ? 'Hide' : 'Show' }} Filters
              </a-menu-item>
              <a-menu-item key="reset">
                Reset to Default
              </a-menu-item>
            </a-menu>
          </template>
          <a-button>
            <EllipsisIcon size="16" />
          </a-button>
        </a-dropdown>
      </div>
    </div>

    <!-- Filter Bar -->
    <FilterBar
      v-if="showFilters"
      :columns="columns"
      :filters="filters"
      :loading="loading"
      @update:filters="updateFilters"
      @add-filter="addFilter"
      @remove-filter="removeFilter"
    />

    <!-- Table -->
    <a-table
      ref="tableRef"
      :columns="tableColumns"
      :data-source="rows"
      :loading="loading"
      :pagination="tablePagination"
      :row-key="rowKey"
      :scroll="{ x: 1200 }"
      :row-selection="rowSelection"
      @change="handleTableChange"
      :virtual="displayOptions.virtualized"
    >
      <!-- Render columns with custom slots -->
      <template v-for="col in columns" #[col.field]="text, record">
        <GridCell
          :key="`${record.id}-${col.field}``
          :column="col"
          :row="record"
          :value="text"
          :editable="col.editable && canEdit"
          @edit="editCell(record, col)"
        />
      </template>

      <!-- Actions column (always last) -->
      <template #actions="text, record">
        <a-space size="small">
          <a-button
            type="text"
            size="small"
            @click="editRow(record)"
            v-if="canEdit"
          >
            <EditIcon size="14" />
          </a-button>
          <a-popconfirm
            title="Delete this record?"
            ok-text="Yes"
            cancel-text="No"
            @confirm="deleteRow(record)"
            v-if="canDelete"
          >
            <a-button type="text" size="small" danger>
              <TrashIcon size="14" />
            </a-button>
          </a-popconfirm>
        </a-space>
      </template>
    </a-table>

    <!-- Edit Modal -->
    <EntityEditModal
      v-if="editingRow"
      :entity="editingRow"
      :entityName="entityName"
      @save="saveRow"
      @cancel="editingRow = null"
      :loading="saving"
    />

    <!-- Realtime indicator -->
    <div v-if="realtimeEnabled" class="realtime-indicator">
      <span class="dot"></span>
      Live Updates
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { message } from 'ant-design-vue';
import type { GridState, GridColumn, FilterCondition } from './types';
import FilterBar from './FilterBar.vue';
import GridCell from './GridCell.vue';
import EntityEditModal from './EntityEditModal.vue';

interface Props {
  entityName: string;
  columns: GridColumn[];
  initialState?: GridState;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canViewSavedViews?: boolean;
  showToolbar?: boolean;
  rowKey?: string;
  realtime?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canViewSavedViews: true,
  showToolbar: true,
  rowKey: 'id',
  realtime: true
});

const emit = defineEmits<{
  add: [];
  edit: [row: any];
  delete: [rows: any[]];
  'state-change': [state: GridState];
}>();

// State
const rows = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const selectedRows = ref<string[]>([]);
const filters = ref<FilterCondition[]>(props.initialState?.filters || []);
const sort = ref(props.initialState?.sort || []);
const currentPage = ref(props.initialState?.pagination.currentPage || 1);
const pageSize = ref(props.initialState?.pagination.pageSize || 10);
const totalCount = ref(0);
const editingRow = ref<any | null>(null);
const showFilters = ref(false);
const quickSearchQuery = ref('');
const savedViews = ref<any[]>([]);
const realtimeEnabled = ref(props.realtime);

// Computed
const densityClasses = computed(() => ({
  [props.initialState?.displayOptions.densityMode || 'comfortable']: true
}));

const displayOptions = computed(() =>
  props.initialState?.displayOptions || {}
);

const tableColumns = computed(() => [
  {
    title: '',
    dataIndex: 'checkbox',
    width: 50,
    align: 'center'
  },
  ...props.columns.map(col => ({
    title: col.label,
    dataIndex: col.field,
    key: col.field,
    width: col.width,
    sorter: col.sortable,
    filteredValue: [],
    onFilter: undefined
  })),
  {
    title: 'Actions',
    key: 'actions',
    width: 100,
    fixed: 'right',
    align: 'center'
  }
]);

const tablePagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: totalCount.value,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total) => `Total ${total} records`
}));

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRows.value,
  onChange: (selected: string[]) => {
    selectedRows.value = selected;
  }
}));

// Methods
async function loadData() {
  loading.value = true;
  try {
    const state = getCurrentGridState();
    const result = await queryEntities(props.entityName, state);

    rows.value = result.rows;
    totalCount.value = result.total;
  } catch (error) {
    message.error('Failed to load data');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

function getCurrentGridState(): GridState {
  return {
    entityName: props.entityName,
    columns: props.columns,
    filters: filters.value,
    sort: sort.value,
    pagination: {
      currentPage: currentPage.value,
      pageSize: pageSize.value,
      totalCount: totalCount.value,
      totalPages: Math.ceil(totalCount.value / pageSize.value)
    },
    selectedRows: selectedRows.value,
    displayOptions: displayOptions.value
  };
}

function updateFilters(newFilters: FilterCondition[]) {
  filters.value = newFilters;
  currentPage.value = 1; // Reset to first page
  loadData();
  emitStateChange();
}

function addFilter() {
  filters.value.push({
    field: props.columns[0].field,
    operator: '=',
    value: null
  });
}

function removeFilter(index: number) {
  filters.value.splice(index, 1);
  loadData();
  emitStateChange();
}

function applyQuickSearch() {
  if (!quickSearchQuery.value) {
    filters.value = filters.value.filter(f => f.field !== '__quick_search');
  } else {
    // Search across text columns
    const textCols = props.columns.filter(c => c.type === 'text');
    filters.value = [
      ...filters.value.filter(f => f.field !== '__quick_search'),
      {
        field: '__quick_search',
        operator: 'like',
        value: quickSearchQuery.value
      }
    ];
  }
  currentPage.value = 1;
  loadData();
  emitStateChange();
}

async function editCell(row: any, column: GridColumn) {
  editingRow.value = { ...row };
}

function editRow(row: any) {
  editingRow.value = { ...row };
}

async function saveRow(updatedRow: any) {
  saving.value = true;
  try {
    await saveEntity(props.entityName, updatedRow);
    message.success('Saved successfully');
    editingRow.value = null;
    loadData();
    emitStateChange();
  } catch (error) {
    message.error('Failed to save');
    console.error(error);
  } finally {
    saving.value = false;
  }
}

async function deleteRow(row: any) {
  await deleteRows([row]);
}

async function deleteSelected() {
  const rowsToDelete = rows.value.filter(r =>
    selectedRows.value.includes(r[props.rowKey])
  );
  await deleteRows(rowsToDelete);
}

async function deleteRows(rowsToDelete: any[]) {
  deleting.value = true;
  try {
    for (const row of rowsToDelete) {
      await deleteEntity(props.entityName, row.id);
    }
    message.success(`Deleted ${rowsToDelete.length} record(s)`);
    selectedRows.value = [];
    loadData();
    emit('delete', rowsToDelete);
  } catch (error) {
    message.error('Failed to delete');
    console.error(error);
  } finally {
    deleting.value = false;
  }
}

function handleTableChange(pagination: any, filters: any, sorter: any) {
  currentPage.value = pagination.current;
  pageSize.value = pagination.pageSize;

  if (sorter.field) {
    sort.value = [
      {
        field: sorter.field,
        direction: sorter.order === 'ascend' ? 'asc' : 'desc'
      }
    ];
  }

  loadData();
}

async function loadSavedView(view: any) {
  filters.value = view.filters;
  sort.value = view.sort;
  currentPage.value = 1;
  loadData();
  emitStateChange();
}

function handleMenuClick(e: any) {
  switch (e.key) {
    case 'save-view':
      // Open save view modal
      break;
    case 'export-csv':
      exportToCSV();
      break;
    case 'export-json':
      exportToJSON();
      break;
    case 'toggle-filters':
      showFilters.value = !showFilters.value;
      break;
    case 'reset':
      filters.value = [];
      sort.value = [];
      currentPage.value = 1;
      loadData();
      emitStateChange();
      break;
  }
}

function exportToCSV() {
  const csv = convertToCSV(rows.value, props.columns);
  downloadFile(csv, `${props.entityName}.csv`, 'text/csv');
}

function exportToJSON() {
  const json = JSON.stringify(rows.value, null, 2);
  downloadFile(json, `${props.entityName}.json`, 'application/json');
}

function emitStateChange() {
  emit('state-change', getCurrentGridState());
}

// Real-time updates
let unsubscribe: (() => void) | null = null;

function subscribeToUpdates() {
  if (!realtimeEnabled.value) return;

  unsubscribe = watchEntity(props.entityName, (event) => {
    switch (event.action) {
      case 'created':
        if (currentPage.value === 1) {
          rows.value.unshift(event.entity);
          totalCount.value++;
        }
        break;
      case 'updated':
        const index = rows.value.findIndex(r => r.id === event.entity.id);
        if (index !== -1) {
          rows.value[index] = event.entity;
        }
        break;
      case 'deleted':
        rows.value = rows.value.filter(r => r.id !== event.entity.id);
        totalCount.value--;
        break;
    }
  });
}

// Lifecycle
onMounted(() => {
  loadData();
  subscribeToUpdates();
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});

watch(
  () => props.entityName,
  () => {
    filters.value = [];
    currentPage.value = 1;
    loadData();
  }
);
</script>

<style scoped lang="postcss">
.data-grid {
  @apply flex flex-col gap-4;
}

.grid-toolbar {
  @apply flex justify-between items-center p-4 bg-gray-50 rounded border;
}

.toolbar-left,
.toolbar-right {
  @apply flex gap-2;
}

.toolbar-right {
  @apply gap-4;
}

.saved-views-list {
  @apply max-h-48 overflow-auto;
}

.saved-view-item {
  @apply p-2 hover:bg-gray-100 cursor-pointer rounded;
}

.view-name {
  @apply font-medium;
}

.view-desc {
  @apply text-xs text-gray-500;
}

.realtime-indicator {
  @apply flex items-center gap-1 text-green-600 text-sm;

  .dot {
    @apply inline-block w-2 h-2 bg-green-600 rounded-full animate-pulse;
  }
}

/* Density modes */
:global(.data-grid.compact) :deep(.ant-table-cell) {
  padding: 4px 8px !important;
}

:global(.data-grid.spacious) :deep(.ant-table-cell) {
  padding: 16px !important;
}
</style>
```

### GridCell Component

Individual cell renderer with inline edit capability.

```vue
<template>
  <div class="grid-cell" @click.stop="enterEditMode" :class="{ editing: isEditing }">
    <!-- Display mode -->
    <div v-if="!isEditing" class="cell-display">
      <component
        :is="rendererComponent"
        :value="value"
        :column="column"
        :row="row"
      />
    </div>

    <!-- Edit mode -->
    <div v-else class="cell-edit">
      <component
        :is="editorComponent"
        v-model="editValue"
        :column="column"
        :row="row"
        @save="saveEdit"
        @cancel="cancelEdit"
      />
      <div v-if="error" class="error-message">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue';
import type { GridColumn } from './types';

interface Props {
  column: GridColumn;
  row: any;
  value: any;
  editable?: boolean;
}

const emit = defineEmits<{
  edit: [{ column: GridColumn; value: any }];
}>();

const isEditing = ref(false);
const editValue = ref(props.value);
const error = ref('');

// Dynamic renderer based on column type
const renderers: Record<string, any> = {
  text: () => import('./renderers/TextRenderer.vue'),
  number: () => import('./renderers/NumberRenderer.vue'),
  date: () => import('./renderers/DateRenderer.vue'),
  boolean: () => import('./renderers/BooleanRenderer.vue'),
  reference: () => import('./renderers/ReferenceRenderer.vue'),
  select: () => import('./renderers/SelectRenderer.vue'),
  currency: () => import('./renderers/CurrencyRenderer.vue'),
  array: () => import('./renderers/ArrayRenderer.vue'),
  custom: () => import('./renderers/CustomRenderer.vue')
};

const editors: Record<string, any> = {
  text: () => import('./editors/TextEditor.vue'),
  number: () => import('./editors/NumberEditor.vue'),
  date: () => import('./editors/DateEditor.vue'),
  boolean: () => import('./editors/BooleanEditor.vue'),
  select: () => import('./editors/SelectEditor.vue'),
  custom: () => import('./editors/CustomEditor.vue')
};

const rendererComponent = computed(() => {
  if (props.column.renderFn) {
    return {
      setup() {
        return () => props.column.renderFn(props.value, props.row, {});
      }
    };
  }
  return defineAsyncComponent(renderers[props.column.type] || renderers.text);
});

const editorComponent = computed(() => {
  const editorType = props.column.editComponent || props.column.type;
  return defineAsyncComponent(editors[editorType] || editors.text);
});

function enterEditMode() {
  if (!props.editable || !props.column.editable) return;
  isEditing.value = true;
  editValue.value = props.value;
  error.value = '';
}

async function saveEdit() {
  // Validate
  if (props.column.validateFn) {
    const validationError = props.column.validateFn(editValue.value, props.row);
    if (validationError) {
      error.value = validationError;
      return;
    }
  }

  emit('edit', {
    column: props.column,
    value: editValue.value
  });

  isEditing.value = false;
}

function cancelEdit() {
  isEditing.value = false;
  editValue.value = props.value;
  error.value = '';
}
</script>

<style scoped lang="postcss">
.grid-cell {
  @apply p-2 cursor-pointer hover:bg-blue-50 transition;
}

.cell-display {
  @apply min-h-6;
}

.cell-edit {
  @apply flex flex-col gap-1;
}

.error-message {
  @apply text-xs text-red-600;
}
</style>
```

### Column Renderers

Example renderers for different data types:

```typescript
// TextRenderer.vue
<template>
  <span class="text-renderer">{{ value }}</span>
</template>

<script setup lang="ts">
interface Props {
  value: string;
  column: any;
  row: any;
}

defineProps<Props>();
</script>

// DateRenderer.vue
<template>
  <span class="date-renderer">
    {{ formatDate(value, column.format) }}
  </span>
</template>

<script setup lang="ts">
import dayjs from 'dayjs';

interface Props {
  value: string;
  column: any;
  row: any;
}

const props = defineProps<Props>();

function formatDate(value: string, format: string = 'DD/MM/YYYY'): string {
  if (!value) return '—';
  return dayjs(value).format(format);
}
</script>

// ReferenceRenderer.vue
<template>
  <a-button
    v-if="relatedEntity"
    type="link"
    size="small"
    @click="$emit('navigate', relatedEntity)"
  >
    {{ displayValue }}
  </a-button>
  <span v-else>—</span>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Props {
  value: string | number;
  column: any;
  row: any;
}

const props = defineProps<Props>();
const relatedEntity = ref<any | null>(null);

const displayValue = computed(() =>
  relatedEntity.value?.[column.displayField] || '—'
);

onMounted(async () => {
  if (!props.value) return;
  // Fetch related entity
  const result = await fetch(
    `/api/${props.column.referenceEntity}/${props.value}`
  );
  relatedEntity.value = await result.json();
});
</script>

// BooleanRenderer.vue
<template>
  <a-checkbox
    :checked="value"
    disabled
  />
</template>

<script setup lang="ts">
interface Props {
  value: boolean;
  column: any;
  row: any;
}

defineProps<Props>();
</script>
```

---

## 4. Nuxt 3 Integration

### useDataGrid Composable

The composable abstracts backend communication and state management for Nuxt 3 SSR environments.

```typescript
// composables/useDataGrid.ts
import { ref, computed, reactive } from 'vue';
import { useFetch } from '#app';
import type { GridState, GridColumn, FilterCondition } from '~/types/datagrid';

interface UseDataGridOptions {
  entityName: string;
  initialColumns: GridColumn[];
  pageSize?: number;
  realtime?: boolean;
}

export function useDataGrid(options: UseDataGridOptions) {
  const {
    entityName,
    initialColumns,
    pageSize = 20,
    realtime = true
  } = options;

  // State
  const rows = ref<any[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const columns = ref(initialColumns);
  const filters = ref<FilterCondition[]>([]);
  const sort = ref([]);
  const currentPage = ref(1);
  const totalCount = ref(0);
  const selectedRows = ref<string[]>([]);

  // GridState
  const gridState = computed((): GridState => ({
    entityName,
    columns: columns.value,
    filters: filters.value,
    sort: sort.value,
    pagination: {
      currentPage: currentPage.value,
      pageSize,
      totalCount: totalCount.value,
      totalPages: Math.ceil(totalCount.value / pageSize),
      offset: (currentPage.value - 1) * pageSize,
      limit: pageSize
    },
    selectedRows: selectedRows.value,
    displayOptions: {}
  }));

  /**
   * Fetch data from backend.
   * Server-side: runs in getServerData() hook.
   * Client-side: runs on ref change.
   */
  async function fetchData() {
    loading.value = true;
    error.value = null;

    try {
      const query = new URLSearchParams();
      query.append('page', currentPage.value.toString());
      query.append('limit', pageSize.toString());

      // Serialize filters to query params
      filters.value.forEach((f, idx) => {
        query.append(`filter[${idx}].field`, f.field);
        query.append(`filter[${idx}].operator`, f.operator);
        query.append(`filter[${idx}].value`, JSON.stringify(f.value));
      });

      // Serialize sort
      sort.value.forEach((s, idx) => {
        query.append(`sort[${idx}].field`, s.field);
        query.append(`sort[${idx}].direction`, s.direction);
      });

      const { data: result } = await useFetch(
        `/api/${entityName}?${query.toString()}`
      );

      rows.value = result.value?.rows || [];
      totalCount.value = result.value?.total || 0;
    } catch (err: any) {
      error.value = err.message;
      console.error(`Failed to fetch ${entityName}:`, err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Server-side data fetching for SSR.
   */
  async function $fetch() {
    const query = new URLSearchParams();
    query.append('page', currentPage.value.toString());
    query.append('limit', pageSize.toString());

    filters.value.forEach((f, idx) => {
      query.append(`filter[${idx}].field`, f.field);
      query.append(`filter[${idx}].operator`, f.operator);
      query.append(`filter[${idx}].value`, JSON.stringify(f.value));
    });

    const response = await $fetch<{ rows: any[]; total: number }>(
      `/api/${entityName}?${query.toString()}`
    );

    return response;
  }

  // Update methods
  function updateFilters(newFilters: FilterCondition[]) {
    filters.value = newFilters;
    currentPage.value = 1;
    fetchData();
  }

  function updateSort(newSort: any[]) {
    sort.value = newSort;
    currentPage.value = 1;
    fetchData();
  }

  function goToPage(page: number) {
    currentPage.value = page;
    fetchData();
  }

  function updatePageSize(newSize: number) {
    // Keep same record position when changing page size
    const currentFirstRecord = (currentPage.value - 1) * pageSize + 1;
    const newPage = Math.ceil(currentFirstRecord / newSize);
    currentPage.value = newPage;
    fetchData();
  }

  // Real-time subscriptions
  let unsubscribe: (() => void) | null = null;

  function subscribeToUpdates() {
    if (!realtime) return;

    unsubscribe = subscribeToEntity(entityName, (event) => {
      switch (event.action) {
        case 'created':
          if (currentPage.value === 1) {
            rows.value.unshift(event.entity);
            totalCount.value++;
          }
          break;
        case 'updated':
          const idx = rows.value.findIndex(r => r.id === event.entity.id);
          if (idx !== -1) {
            rows.value[idx] = event.entity;
          }
          break;
        case 'deleted':
          rows.value = rows.value.filter(r => r.id !== event.entity.id);
          totalCount.value--;
          break;
      }
    });
  }

  function unsubscribeFromUpdates() {
    if (unsubscribe) {
      unsubscribe();
    }
  }

  return {
    // State
    rows,
    loading,
    error,
    columns,
    filters,
    sort,
    currentPage,
    totalCount,
    selectedRows,
    gridState,

    // Methods
    fetchData,
    $fetch,
    updateFilters,
    updateSort,
    goToPage,
    updatePageSize,
    subscribeToUpdates,
    unsubscribeFromUpdates
  };
}

/**
 * Subscribe to real-time entity updates via WebSocket.
 */
function subscribeToEntity(
  entityName: string,
  callback: (event: any) => void
): () => void {
  const ws = new WebSocket(`wss://${location.host}/ws`);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'subscribe',
      entity: entityName
    }));
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.entity === entityName) {
      callback(message);
    }
  };

  return () => {
    ws.close();
  };
}
```

### Page Usage Example

```vue
<template>
  <div class="tickets-page">
    <h1>Support Tickets</h1>

    <DataGrid
      :entity-name="entityName"
      :columns="columns"
      :initial-state="gridState"
      :can-create="canCreate"
      :can-edit="canEdit"
      :can-delete="canDelete"
      @state-change="updateGridState"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDataGrid } from '~/composables/useDataGrid';
import DataGrid from '~/components/DataGrid.vue';
import type { GridColumn, GridState } from '~/types/datagrid';

const entityName = 'support:ticket';

const columns: GridColumn[] = [
  {
    field: 'id',
    label: 'ID',
    type: 'text',
    width: 80,
    sortable: true,
    filterable: true
  },
  {
    field: 'title',
    label: 'Title',
    type: 'text',
    width: 250,
    sortable: true,
    filterable: true,
    editable: true
  },
  {
    field: 'status',
    label: 'Status',
    type: 'select',
    width: 100,
    sortable: true,
    filterable: true,
    editable: true,
    editProps: {
      options: [
        { value: 'open', label: 'Open' },
        { value: 'in-progress', label: 'In Progress' },
        { value: 'resolved', label: 'Resolved' },
        { value: 'closed', label: 'Closed' }
      ]
    }
  },
  {
    field: 'priority',
    label: 'Priority',
    type: 'select',
    width: 100,
    sortable: true,
    filterable: true,
    editable: true
  },
  {
    field: 'assignedTo',
    label: 'Assigned To',
    type: 'reference',
    width: 150,
    sortable: true,
    filterable: true,
    editable: true
  },
  {
    field: 'createdAt',
    label: 'Created',
    type: 'date',
    width: 120,
    sortable: true,
    filterable: true,
    format: 'DD/MM/YYYY'
  },
  {
    field: 'updatedAt',
    label: 'Updated',
    type: 'date',
    width: 120,
    sortable: true
  }
];

// Use composable
const {
  rows,
  loading,
  columns: gridColumns,
  filters,
  sort,
  currentPage,
  totalCount,
  gridState,
  fetchData,
  updateFilters,
  updateSort,
  goToPage,
  subscribeToUpdates,
  unsubscribeFromUpdates
} = useDataGrid({
  entityName,
  initialColumns: columns,
  pageSize: 20,
  realtime: true
});

// Permissions (from auth store)
const canCreate = ref(true);
const canEdit = ref(true);
const canDelete = ref(true);

// Server-side data loading
if (process.server) {
  const { data } = await useAsyncData('tickets', async () => {
    return await $fetch(`/api/${entityName}`);
  });
}

// Client-side subscription
onMounted(() => {
  subscribeToUpdates();
  fetchData();
});

onUnmounted(() => {
  unsubscribeFromUpdates();
});

function updateGridState(newState: GridState) {
  // Persist to localStorage or user preferences
  localStorage.setItem(`grid-state-${entityName}`, JSON.stringify(newState));
}
</script>
```

---

## 5. Real-Time Update Mechanism

### WebSocket Event System

Real-time updates are driven by WebSocket events emitted by the backend runtime. The frontend subscribes to specific entity changes and updates the grid immediately.

```typescript
/**
 * WebSocket event types emitted by backend runtime.
 */
export interface EntityWebSocketEvent {
  type: 'entity:action';
  entity: string;                // Fully qualified: 'support:ticket'
  action: 'created' | 'updated' | 'deleted';
  data: {
    id: string | number;
    record: any;                 // Full entity data after change
    previousRecord?: any;         // Before-state (for updates)
    changedFields?: string[];    // Only fields that changed
  };
  userId: string;               // Who triggered the change
  timestamp: string;            // ISO timestamp
  correlationId?: string;       // Trace back to operation
}

/**
 * Grid real-time update listener.
 */
export class GridRealtimeManager {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private reconnectDelay = 1000;

  constructor(wsUrl: string = `wss://${location.host}/ws`) {
    this.connect(wsUrl);
  }

  private connect(wsUrl: string) {
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[DataGrid] WebSocket connected');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('[DataGrid] WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.warn('[DataGrid] WebSocket disconnected');
        this.attemptReconnect(wsUrl);
      };
    } catch (error) {
      console.error('[DataGrid] Failed to connect WebSocket:', error);
      this.attemptReconnect(wsUrl);
    }
  }

  private attemptReconnect(wsUrl: string) {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('[DataGrid] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      console.log(`[DataGrid] Reconnecting... (attempt ${this.reconnectAttempts})`);
      this.connect(wsUrl);
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  private handleMessage(jsonData: string) {
    try {
      const message = JSON.parse(jsonData);

      if (message.type === 'entity:action') {
        const event = message as EntityWebSocketEvent;
        this.dispatchEvent(event.entity, event);
      }
    } catch (error) {
      console.error('[DataGrid] Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Subscribe to entity updates.
   * @param entityName - Fully qualified entity name (e.g. 'support:ticket')
   * @param callback - Called with EntityWebSocketEvent on any change
   * @returns Unsubscribe function
   */
  subscribe(
    entityName: string,
    callback: (event: EntityWebSocketEvent) => void
  ): () => void {
    if (!this.subscriptions.has(entityName)) {
      this.subscriptions.set(entityName, new Set());

      // Send subscription request to backend
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'subscribe',
          entity: entityName
        }));
      }
    }

    this.subscriptions.get(entityName)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(entityName);
      if (callbacks) {
        callbacks.delete(callback);

        // If no more subscribers, unsubscribe from backend
        if (callbacks.size === 0) {
          this.subscriptions.delete(entityName);
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              type: 'unsubscribe',
              entity: entityName
            }));
          }
        }
      }
    };
  }

  private dispatchEvent(entityName: string, event: EntityWebSocketEvent) {
    const callbacks = this.subscriptions.get(entityName);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(event);
        } catch (error) {
          console.error('[DataGrid] Error in event callback:', error);
        }
      }
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * Global instance (Nuxt plugin).
 */
let realtimeManager: GridRealtimeManager | null = null;

export function useRealtimeManager(): GridRealtimeManager {
  if (!realtimeManager && process.client) {
    realtimeManager = new GridRealtimeManager();
  }
  return realtimeManager!;
}
```

### Grid Real-Time Integration

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { useRealtimeManager } from '~/composables/useRealtimeManager';
import type { EntityWebSocketEvent } from '~/types/realtime';

interface Props {
  entityName: string;
  realtime?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  realtime: true
});

const realtimeManager = useRealtimeManager();
let unsubscribe: (() => void) | null = null;

// Handle real-time events
const handleRealtimeEvent = (event: EntityWebSocketEvent) => {
  switch (event.action) {
    case 'created':
      onEntityCreated(event);
      break;
    case 'updated':
      onEntityUpdated(event);
      break;
    case 'deleted':
      onEntityDeleted(event);
      break;
  }
};

function onEntityCreated(event: EntityWebSocketEvent) {
  // Add to grid if on first page
  if (currentPage.value === 1) {
    rows.value.unshift(event.data.record);
    totalCount.value++;

    // Show notification
    showNotification('info', 'New record added', event.data.record);
  } else {
    // Update count, notify user to refresh
    totalCount.value++;
    showNotification('info', 'New record created', 'Refresh to see it');
  }
}

function onEntityUpdated(event: EntityWebSocketEvent) {
  const index = rows.value.findIndex(r => r.id === event.data.id);

  if (index !== -1) {
    // Optimistic update
    const originalRecord = rows.value[index];

    // Apply changes
    rows.value[index] = {
      ...rows.value[index],
      ...event.data.record
    };

    // Show what changed
    const changedFields = event.data.changedFields?.join(', ') || 'Unknown fields';
    showNotification('info', 'Record updated', `${changedFields} changed`);

    // Rollback on error (if needed)
    // Can add undo mechanism here
  } else {
    // Record not on current page, increment version to invalidate cache
    gridVersionRef.value++;
    showNotification('info', 'Record updated', 'On another page');
  }
}

function onEntityDeleted(event: EntityWebSocketEvent) {
  const index = rows.value.findIndex(r => r.id === event.data.id);

  if (index !== -1) {
    rows.value.splice(index, 1);
    totalCount.value--;

    showNotification('warning', 'Record deleted', event.data.record);
  } else {
    totalCount.value--;
  }

  // Clear selection if deleted row was selected
  selectedRows.value = selectedRows.value.filter(id => id !== event.data.id);
}

onMounted(() => {
  if (props.realtime) {
    unsubscribe = realtimeManager.subscribe(
      props.entityName,
      handleRealtimeEvent
    );
  }
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});

// Resubscribe if entity changes
watch(
  () => props.entityName,
  () => {
    if (unsubscribe) unsubscribe();
    if (props.realtime) {
      unsubscribe = realtimeManager.subscribe(
        props.entityName,
        handleRealtimeEvent
      );
    }
  }
);
</script>
```

---

## Summary Table

| Aspect | Component | Responsibility |
|--------|-----------|-----------------|
| **State** | GridState, GridColumn, FilterCondition | Serializable grid configuration |
| **Backend** | FilterTranslator, EntityQueryService | Convert grid state to ORM queries |
| **Frontend** | DataGrid, GridCell, Renderers | Display and interact with data |
| **Composable** | useDataGrid | Fetch data, manage state, fetch logic |
| **Real-Time** | GridRealtimeManager, WebSocket events | Update grid on entity changes |
| **Permissions** | GridColumn.readableByRoles, editableByRoles | RBAC-driven column visibility/edit |

---

## Best Practices

1. **State Serialization**: Always serialize GridState to localStorage for view restoration
2. **Pagination**: Keep page size reasonable (20-50 rows) for client memory efficiency
3. **Sorting**: Limit to 3 columns max to avoid complex queries
4. **Filtering**: Encourage use of saved views for complex filters
5. **Real-Time**: Disable for large datasets or high-frequency updates
6. **Validation**: Run pre-save validation tied to entity field rules
7. **Permissions**: Check RBAC rules before rendering edit controls
8. **Performance**: Use virtualization for grids with 1000+ rows
9. **Error Handling**: Show user-friendly messages, log technical details
10. **Testing**: Test filter translation, sorting, pagination, and real-time events independently

