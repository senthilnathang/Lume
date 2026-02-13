<script setup lang="ts">
import { useUsersApi } from '~/app/composables/api/useUsersApi';

definePageMeta({ middleware: 'auth' });

const api = useUsersApi();
const items = ref<any[]>([]);
const loading = ref(false);
const searchText = ref('');
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });

async function fetchData() {
  loading.value = true;
  try {
    const res = await api.list({
      page: pagination.page,
      pageSize: pagination.pageSize,
      search: searchText.value || undefined,
    });
    items.value = res.data;
    pagination.total = res.pagination.total;
  } catch (error) {
    console.error('Failed to fetch users:', error);
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  fetchData();
}

function handlePageChange(page: number) {
  pagination.page = page;
  fetchData();
}

onMounted(fetchData);
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-heading font-bold text-gray-900">Users</h1>
      <NuxtLink to="/settings/users/create"
        class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
        Add User
      </NuxtLink>
    </div>

    <!-- Search -->
    <div class="flex gap-4">
      <input v-model="searchText" @keyup.enter="handleSearch" type="text" placeholder="Search users..."
        class="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
      <button @click="handleSearch"
        class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
        Search
      </button>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-gray-500">Loading...</div>
      <table v-else class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="user in items" :key="user.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ user.full_name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ user.email }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ user.username }}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 text-xs font-medium rounded-full"
                :class="user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                {{ user.is_active ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
              <NuxtLink :to="`/settings/users/${user.id}`" class="text-primary-600 hover:text-primary-800 mr-3">
                View
              </NuxtLink>
            </td>
          </tr>
          <tr v-if="items.length === 0">
            <td colspan="5" class="px-6 py-8 text-center text-gray-500">No users found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.total > pagination.pageSize" class="flex items-center justify-between">
      <p class="text-sm text-gray-500">
        Showing {{ (pagination.page - 1) * pagination.pageSize + 1 }} to
        {{ Math.min(pagination.page * pagination.pageSize, pagination.total) }} of {{ pagination.total }}
      </p>
      <div class="flex gap-2">
        <button @click="handlePageChange(pagination.page - 1)" :disabled="pagination.page <= 1"
          class="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50">
          Previous
        </button>
        <button @click="handlePageChange(pagination.page + 1)"
          :disabled="pagination.page * pagination.pageSize >= pagination.total"
          class="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50">
          Next
        </button>
      </div>
    </div>
  </div>
</template>
