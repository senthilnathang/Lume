<script setup lang="ts">
import { useCompaniesApi } from '~/app/composables/api/useCompaniesApi';

definePageMeta({ middleware: 'auth' });

const api = useCompaniesApi();
const items = ref<any[]>([]);
const loading = ref(false);
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });

async function fetchData() {
  loading.value = true;
  try {
    const res = await api.list({ page: pagination.page, pageSize: pagination.pageSize });
    items.value = res.data;
    pagination.total = res.pagination.total;
  } catch (error) {
    console.error('Failed to fetch companies:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-heading font-bold text-gray-900">Companies</h1>
      <button class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
        Add Company
      </button>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-gray-500">Loading...</div>
      <table v-else class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">HQ</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="company in items" :key="company.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ company.name }}</td>
            <td class="px-6 py-4 text-sm text-gray-500 font-mono">{{ company.code }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ company.city }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ company.country }}</td>
            <td class="px-6 py-4">
              <span class="px-2 py-1 text-xs font-medium rounded-full"
                :class="company.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                {{ company.is_active ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="px-6 py-4">
              <span v-if="company.is_headquarters" class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">HQ</span>
            </td>
          </tr>
          <tr v-if="items.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-gray-500">No companies found</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
