<script setup lang="ts">
import { usePermissionsApi } from '~/app/composables/api/usePermissionsApi';

definePageMeta({ middleware: 'auth' });

const api = usePermissionsApi();
const items = ref<any[]>([]);
const loading = ref(false);
const searchText = ref('');
const pagination = reactive({ page: 1, pageSize: 50, total: 0 });
const categoryFilter = ref('');

const categories = ['system', 'module', 'data', 'ui', 'api', 'workflow', 'report', 'other'];

async function fetchData() {
  loading.value = true;
  try {
    const params: any = {
      page: pagination.page, pageSize: pagination.pageSize,
      search: searchText.value || undefined,
    };
    if (categoryFilter.value) params.category = categoryFilter.value;
    const res = await api.list(params);
    items.value = res.data;
    pagination.total = res.pagination.total;
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-heading font-bold text-gray-900">Permissions</h1>
    </div>

    <div class="flex gap-4">
      <input v-model="searchText" @keyup.enter="fetchData" type="text" placeholder="Search permissions..."
        class="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-lg shadow-sm sm:text-sm" />
      <select v-model="categoryFilter" @change="fetchData"
        class="px-3 py-2 border border-gray-300 rounded-lg shadow-sm sm:text-sm">
        <option value="">All Categories</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-gray-500">Loading...</div>
      <table v-else class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Codename</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="perm in items" :key="perm.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ perm.name }}</td>
            <td class="px-6 py-4 text-sm text-gray-500 font-mono">{{ perm.codename }}</td>
            <td class="px-6 py-4">
              <span class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">{{ perm.category }}</span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ perm.action }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ perm.resource }}</td>
          </tr>
          <tr v-if="items.length === 0">
            <td colspan="5" class="px-6 py-8 text-center text-gray-500">No permissions found</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
