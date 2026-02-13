<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

const items = ref<any[]>([]);
const loading = ref(false);
const pagination = reactive({ page: 1, pageSize: 50, total: 0 });
const entityTypeFilter = ref('');

async function fetchData() {
  loading.value = true;
  try {
    const params: any = { page: pagination.page, pageSize: pagination.pageSize };
    if (entityTypeFilter.value) params.entity_type = entityTypeFilter.value;
    const token = localStorage.getItem('access_token');
    const res = await $fetch<any>('/api/v1/audit', { headers: { Authorization: `Bearer ${token}` }, params });
    items.value = res.data;
    pagination.total = res.pagination.total;
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
  } finally {
    loading.value = false;
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleString();
}

onMounted(fetchData);
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-heading font-bold text-gray-900">Audit Logs</h1>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-gray-500">Loading...</div>
      <table v-else class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="log in items" :key="log.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 text-sm text-gray-500">{{ formatDate(log.created_at) }}</td>
            <td class="px-6 py-4">
              <span class="px-2 py-1 text-xs font-medium rounded-full"
                :class="{
                  'bg-green-100 text-green-700': log.action === 'create',
                  'bg-blue-100 text-blue-700': log.action === 'update',
                  'bg-red-100 text-red-700': log.action === 'delete',
                  'bg-gray-100 text-gray-700': !['create','update','delete'].includes(log.action),
                }">
                {{ log.action }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ log.entity_type }}</td>
            <td class="px-6 py-4 text-sm text-gray-900">{{ log.entity_name }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ log.user_id }}</td>
            <td class="px-6 py-4 text-sm text-gray-400 font-mono">{{ log.ip_address }}</td>
          </tr>
          <tr v-if="items.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-gray-500">No audit logs found</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
