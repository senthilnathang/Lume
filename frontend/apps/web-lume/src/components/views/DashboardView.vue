<template>
  <div class="dashboard-view">
    <div class="dashboard-grid">
      <div
        v-for="widget in widgets"
        :key="widget.id"
        :style="{ gridColumn: `span ${widget.width || 1}` }"
        class="dashboard-widget"
      >
        <div class="widget-header">
          <h3>{{ widget.title }}</h3>
        </div>
        <div class="widget-body">
          <component
            :is="getWidgetComponent(widget.type)"
            :widget="widget"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import CounterWidget from './widgets/CounterWidget.vue';
import ChartWidget from './widgets/ChartWidget.vue';
import TableWidget from './widgets/TableWidget.vue';

const props = defineProps<{
  viewDefinition: any;
  entityId: number;
}>();

const widgets = ref([
  {
    id: 1,
    title: 'Total Records',
    type: 'counter',
    width: 1,
    value: 1250,
    color: 'blue',
  },
  {
    id: 2,
    title: 'Active Records',
    type: 'counter',
    width: 1,
    value: 890,
    color: 'green',
  },
  {
    id: 3,
    title: 'Pending Records',
    type: 'counter',
    width: 1,
    value: 360,
    color: 'orange',
  },
  {
    id: 4,
    title: 'Sales by Month',
    type: 'chart',
    width: 2,
    chartType: 'line',
  },
  {
    id: 5,
    title: 'Top Records',
    type: 'table',
    width: 2,
  },
]);

const getWidgetComponent = (type: string) => {
  const componentMap: Record<string, any> = {
    counter: CounterWidget,
    chart: ChartWidget,
    table: TableWidget,
  };
  return componentMap[type] || CounterWidget;
};
</script>

<style scoped>
.dashboard-view {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

.dashboard-widget {
  background: white;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.widget-header {
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f9f9f9;
}

.widget-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.widget-body {
  padding: 20px;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
