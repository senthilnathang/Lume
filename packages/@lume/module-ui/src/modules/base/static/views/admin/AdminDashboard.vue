<template>
  <div class="admin-dashboard p-6 max-w-7xl mx-auto">
    <div class="mb-8">
      <h1 class="text-4xl font-bold mb-2">Admin Dashboard</h1>
      <p class="text-gray-600">Manage modules, workflows, policies, and plugins</p>
    </div>

    <a-segmented v-model:value="activeTab" block :options="tabOptions" @change="handleTabChange" class="mb-6" />

    <div class="bg-white rounded-lg shadow-lg p-6">
      <!-- Modules Tab -->
      <ModulesManagement v-if="activeTab === 'modules'" />

      <!-- Workflows Tab -->
      <WorkflowsManagement v-if="activeTab === 'workflows'" />

      <!-- Policies Tab -->
      <PoliciesManagement v-if="activeTab === 'policies'" />

      <!-- Plugins Tab -->
      <PluginsManagement v-if="activeTab === 'plugins'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ModulesManagement from './ModulesManagement.vue';
import WorkflowsManagement from './WorkflowsManagement.vue';
import PoliciesManagement from './PoliciesManagement.vue';
import PluginsManagement from './PluginsManagement.vue';

const activeTab = ref<string>('modules');

const tabOptions = [
  { label: 'Modules', value: 'modules' },
  { label: 'Workflows', value: 'workflows' },
  { label: 'Policies', value: 'policies' },
  { label: 'Plugins', value: 'plugins' },
];

const handleTabChange = () => {
  // Tab change handled by activeTab ref binding
};
</script>

<style scoped>
.admin-dashboard {
  background: #f5f5f5;
  min-height: 100vh;
}
</style>
