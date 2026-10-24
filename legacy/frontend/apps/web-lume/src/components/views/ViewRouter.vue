<template>
  <div class="view-router">
    <component
      :is="viewComponent"
      :view-definition="viewDefinition"
      :entity-id="entityId"
      @record-selected="$emit('record-selected', $event)"
      @record-updated="$emit('record-updated', $event)"
      @record-created="$emit('record-created', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import FormView from './FormView.vue';
import TableView from './TableView.vue';
import KanbanBoardView from './KanbanBoardView.vue';
import CalendarView from './CalendarView.vue';
import DataGrid from './DataGrid.vue';
import DashboardView from './DashboardView.vue';

const props = defineProps<{
  viewDefinition: any;
  entityId: number;
}>();

const viewComponentMap: Record<string, any> = {
  form: FormView,
  table: TableView,
  kanban: KanbanBoardView,
  calendar: CalendarView,
  grid: DataGrid,
  dashboard: DashboardView,
};

const viewComponent = computed(() => {
  const type = props.viewDefinition?.type || 'table';
  return viewComponentMap[type] || TableView;
});

defineEmits<{
  'record-selected': [record: any];
  'record-updated': [record: any];
  'record-created': [record: any];
}>();
</script>

<style scoped>
.view-router {
  width: 100%;
  height: 100%;
}
</style>
