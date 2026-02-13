<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

const items = ref<any[]>([]);
const loading = ref(false);
const searchText = ref('');
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });

async function fetchData() {
  loading.value = true;
  try {
    const token = localStorage.getItem('access_token');
    const res = await $fetch<any>('/api/v1/employee', {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: pagination.page, pageSize: pagination.pageSize, search: searchText.value || undefined },
    }).catch(() => ({ data: [], pagination: { total: 0 } }));
    items.value = res.data || [];
    pagination.total = res.pagination?.total || 0;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-heading font-bold text-gray-900">Employees</h1>
      <button class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
        Add Employee
      </button>
    </div>

    <div class="flex gap-4">
      <input v-model="searchText" @keyup.enter="fetchData" type="text" placeholder="Search employees..."
        class="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-lg shadow-sm sm:text-sm" />
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-gray-500">Loading...</div>
      <div v-else-if="items.length === 0" class="p-16 text-center">
        <p class="text-gray-500">No employees found</p>
        <p class="text-sm text-gray-400 mt-1">Employee module will be available after HRMS module migration</p>
      </div>
      <table v-else class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="emp in items" :key="emp.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 text-sm font-mono text-gray-500">{{ emp.employee_id }}</td>
            <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ emp.first_name }} {{ emp.last_name }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ emp.department?.name }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ emp.job_position?.title }}</td>
            <td class="px-6 py-4">
              <span class="px-2 py-1 text-xs font-medium rounded-full"
                :class="emp.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                {{ emp.is_active ? 'Active' : 'Inactive' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
