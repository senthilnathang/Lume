<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

const items = ref<any[]>([]);
const loading = ref(false);
const pagination = reactive({ page: 1, pageSize: 50, total: 0 });

async function fetchData() {
  loading.value = true;
  try {
    const token = localStorage.getItem('access_token');
    const res = await $fetch<any>('/api/v1/activity', {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: pagination.page, pageSize: pagination.pageSize },
    });
    items.value = res.data;
    pagination.total = res.pagination.total;
  } catch (error) {
    console.error('Failed to fetch activity logs:', error);
  } finally {
    loading.value = false;
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleString();
}

function levelColor(level: string) {
  const map: Record<string, string> = {
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
    critical: 'bg-red-200 text-red-800',
    debug: 'bg-gray-100 text-gray-600',
  };
  return map[level] || 'bg-gray-100 text-gray-700';
}

onMounted(fetchData);
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-heading font-bold text-gray-900">Activity Logs</h1>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-gray-500">Loading...</div>
      <table v-else class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="log in items" :key="log.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 text-sm text-gray-500">{{ formatDate(log.created_at) }}</td>
            <td class="px-6 py-4">
              <span class="px-2 py-1 text-xs font-medium rounded-full" :class="levelColor(log.level)">
                {{ log.level }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ log.category }}</td>
            <td class="px-6 py-4 text-sm text-gray-900">{{ log.action }}</td>
            <td class="px-6 py-4 text-sm text-gray-500 max-w-md truncate">{{ log.description }}</td>
          </tr>
          <tr v-if="items.length === 0">
            <td colspan="5" class="px-6 py-8 text-center text-gray-500">No activity logs found</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
