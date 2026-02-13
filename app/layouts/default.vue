<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { useCompanyStore } from '~/stores/company';

const authStore = useAuthStore();
const companyStore = useCompanyStore();
const route = useRoute();

const sidebarCollapsed = ref(false);
const showUserMenu = ref(false);

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: 'home' },
  { label: 'Modules', path: '/modules', icon: 'grid' },
  {
    label: 'Settings', icon: 'settings', children: [
      { label: 'Users', path: '/settings/users' },
      { label: 'Roles', path: '/settings/roles' },
      { label: 'Permissions', path: '/settings/permissions' },
      { label: 'Groups', path: '/settings/groups' },
      { label: 'Companies', path: '/settings/companies' },
      { label: 'Security', path: '/settings/security' },
      { label: 'Audit Logs', path: '/settings/audit-logs' },
      { label: 'Activity Logs', path: '/settings/activity-logs' },
    ],
  },
  { label: 'Security', path: '/security/dashboard', icon: 'shield' },
];

const expandedGroups = ref<string[]>(['Settings']);

function toggleGroup(label: string) {
  const idx = expandedGroups.value.indexOf(label);
  if (idx >= 0) expandedGroups.value.splice(idx, 1);
  else expandedGroups.value.push(label);
}

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/');
}

function handleLogout() {
  authStore.logout();
}

// Close user menu on click outside
function closeUserMenu() {
  showUserMenu.value = false;
}
</script>

<template>
  <div class="min-h-screen flex bg-gray-50">
    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-gray-200 transition-all duration-300"
      :class="sidebarCollapsed ? 'w-16' : 'w-64'">
      <!-- Logo -->
      <div class="flex items-center h-16 px-4 border-b border-gray-100">
        <span v-if="!sidebarCollapsed" class="text-xl font-heading font-bold text-primary-700">Lume</span>
        <span v-else class="text-xl font-heading font-bold text-primary-700 mx-auto">L</span>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <template v-for="item in navItems" :key="item.label">
          <!-- Group with children -->
          <div v-if="item.children">
            <button @click="toggleGroup(item.label)"
              class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              :class="{ 'justify-center': sidebarCollapsed }">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span v-if="!sidebarCollapsed" class="flex-1 text-left">{{ item.label }}</span>
              <svg v-if="!sidebarCollapsed" class="w-4 h-4 transition-transform" :class="expandedGroups.includes(item.label) ? 'rotate-90' : ''"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div v-if="expandedGroups.includes(item.label) && !sidebarCollapsed" class="ml-8 space-y-1 mt-1">
              <NuxtLink v-for="child in item.children" :key="child.path" :to="child.path"
                class="block px-3 py-1.5 text-sm rounded-lg transition-colors"
                :class="isActive(child.path) ? 'text-primary-700 bg-primary-50 font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'">
                {{ child.label }}
              </NuxtLink>
            </div>
          </div>

          <!-- Single nav item -->
          <NuxtLink v-else :to="item.path!"
            class="flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors"
            :class="[
              isActive(item.path!) ? 'text-primary-700 bg-primary-50 font-medium' : 'text-gray-600 hover:bg-gray-50',
              sidebarCollapsed ? 'justify-center' : '',
            ]">
            <!-- Home icon -->
            <svg v-if="item.icon === 'home'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <!-- Grid icon -->
            <svg v-else-if="item.icon === 'grid'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <!-- Shield icon -->
            <svg v-else-if="item.icon === 'shield'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span v-if="!sidebarCollapsed">{{ item.label }}</span>
          </NuxtLink>
        </template>
      </nav>

      <!-- Collapse toggle -->
      <div class="p-3 border-t border-gray-100">
        <button @click="sidebarCollapsed = !sidebarCollapsed"
          class="w-full flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
          <svg class="w-5 h-5 transition-transform" :class="sidebarCollapsed ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col transition-all duration-300" :class="sidebarCollapsed ? 'ml-16' : 'ml-64'">
      <!-- Header -->
      <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-500">
            {{ companyStore.companyName || 'No Company' }}
          </span>
        </div>

        <div class="flex items-center gap-4">
          <!-- User menu -->
          <div class="relative">
            <button @click="showUserMenu = !showUserMenu"
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span class="text-sm font-medium text-primary-700">
                  {{ (authStore.fullName || 'U').charAt(0).toUpperCase() }}
                </span>
              </div>
              <span class="text-sm text-gray-700 hidden md:inline">{{ authStore.fullName }}</span>
            </button>

            <div v-if="showUserMenu" @click="closeUserMenu"
              class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <NuxtLink to="/profile" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                My Profile
              </NuxtLink>
              <hr class="my-1 border-gray-100" />
              <button @click="handleLogout" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1">
        <slot />
      </main>
    </div>
  </div>
</template>
