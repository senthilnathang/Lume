<template>
  <div class="table-widget">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in data" :key="row.id">
          <td>{{ row.name }}</td>
          <td>{{ row.status }}</td>
          <td>{{ row.value }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  widget: any;
}>();

const data = ref([
  { id: 1, name: 'Item 1', status: 'Active', value: 1234 },
  { id: 2, name: 'Item 2', status: 'Active', value: 5678 },
  { id: 3, name: 'Item 3', status: 'Inactive', value: 9012 },
]);
</script>

<style scoped>
.table-widget {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

th {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 600;
  color: #333;
}

td {
  padding: 8px;
  border-bottom: 1px solid #e0e0e0;
  color: #555;
}

tr:hover {
  background-color: #f9f9f9;
}
</style>
