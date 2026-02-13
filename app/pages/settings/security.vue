<script setup lang="ts">
definePageMeta({ middleware: 'auth' });
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-heading font-bold text-gray-900">Security Settings</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <NuxtLink to="/security/dashboard"
        class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <h3 class="text-lg font-semibold text-gray-900">Security Dashboard</h3>
        <p class="text-sm text-gray-500 mt-1">View trust levels, sessions, and security events</p>
      </NuxtLink>

      <NuxtLink to="/settings/audit-logs"
        class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <h3 class="text-lg font-semibold text-gray-900">Audit Logs</h3>
        <p class="text-sm text-gray-500 mt-1">Review system audit trail</p>
      </NuxtLink>

      <NuxtLink to="/settings/activity-logs"
        class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <h3 class="text-lg font-semibold text-gray-900">Activity Logs</h3>
        <p class="text-sm text-gray-500 mt-1">Monitor user and system activity</p>
      </NuxtLink>

      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 class="text-lg font-semibold text-gray-900">Access Control</h3>
        <p class="text-sm text-gray-500 mt-1">Configure ACL, RLS, and field permissions</p>
        <p class="text-xs text-gray-400 mt-2">Coming with base_security module</p>
      </div>
    </div>
  </div>
</template>
