<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

const modules = ref<any[]>([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    const token = localStorage.getItem('access_token');
    const res = await $fetch<any>('/api/v1/modules', {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => ({ data: [] }));
    modules.value = res.data || [];
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-heading font-bold text-gray-900">Modules</h1>
    <p class="text-sm text-gray-500">Manage installed modules and discover new ones</p>

    <div v-if="loading" class="text-center text-gray-500 py-8">Loading modules...</div>

    <div v-else-if="modules.length === 0" class="text-center py-16">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </div>
      <p class="text-gray-500">No modules installed yet</p>
      <p class="text-sm text-gray-400 mt-1">Modules will appear here once backend module system is configured</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="mod in modules" :key="mod.name"
        class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ mod.display_name || mod.name }}</h3>
            <p class="text-sm text-gray-500 mt-1">{{ mod.description }}</p>
          </div>
          <span class="px-2 py-1 text-xs rounded-full"
            :class="mod.is_installed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
            {{ mod.is_installed ? 'Installed' : 'Available' }}
          </span>
        </div>
        <div class="mt-4 text-xs text-gray-400">
          v{{ mod.version || '1.0.0' }}
        </div>
      </div>
    </div>
  </div>
</template>
