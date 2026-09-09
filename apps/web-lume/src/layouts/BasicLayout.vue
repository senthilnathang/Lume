<template>
  <div class="lume-layout" :class="`layout-${currentLayout}`" :style="{ '--sidebar-width': `${sidebarWidth}px` }">
    <Sidebar
      v-if="isAuthenticated && currentLayout !== 'topnav'"
      :menus="menus"
      :collapsed="sidebarCollapsed"
      :width="sidebarWidth"
      @toggle="toggleSidebar"
    />
    <div class="lume-layout-main" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <Header
        v-if="isAuthenticated"
        :user="user"
        :menus="menus"
        @toggle-sidebar="toggleSidebar"
        @logout="handleLogout"
      />
      <TopNavBar v-if="isAuthenticated && currentLayout !== 'sidebar'" :menus="menus" />
      <TabBar v-if="isAuthenticated" />
      <div class="lume-layout-content">
        <RouterView :key="tabRefreshKey" />
      </div>
    </div>
    <CommandPalette v-if="isAuthenticated" :visible="commandPaletteOpen" @close="commandPaletteOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { usePermissionStore } from '@/store/permission';
import Sidebar from '@/components/layout/Sidebar.vue';
import Header from '@/components/layout/Header.vue';
import TopNavBar from '@/components/layout/TopNavBar.vue';
import TabBar from '@/components/layout/TabBar.vue';
import CommandPalette from '@modules/common/static/components/CommandPalette.vue';
import { useLumeTheme } from '@/composables/useLumeTheme';
import { useTabBarStore } from '@/store/tabbar';
import { storeToRefs } from 'pinia';

const router = useRouter();
const authStore = useAuthStore();
const permissionStore = usePermissionStore();
const { currentLayout, sidebarCollapsed, sidebarWidth, toggleSidebar } = useLumeTheme();
const { refreshKey: tabRefreshKey } = storeToRefs(useTabBarStore());

const commandPaletteOpen = ref(false);

const handleKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    commandPaletteOpen.value = !commandPaletteOpen.value;
  }
};

const isAuthenticated = computed(() => authStore.isAuthenticated);
const user = computed(() => authStore.userInfo);
const menus = computed(() => permissionStore.menus);

// Fetch permissions and menus on mount
onMounted(async () => {
  if (authStore.token) {
    await permissionStore.fetchPermissions();
    await permissionStore.fetchMenus();
  }
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};
</script>

<style scoped>
.lume-layout {
  display: flex;
  min-height: 100vh;
  background: #f1f5f9;
}

.lume-layout-main {
  flex: 1;
  margin-left: var(--sidebar-width, 260px);
  transition: margin-left 0.3s ease;
  display: flex;
  flex-direction: column;
}

.lume-layout-main.sidebar-collapsed {
  margin-left: 72px;
}

.layout-topnav .lume-layout-main,
.layout-topnav .lume-layout-main.sidebar-collapsed {
  margin-left: 0;
}

.lume-layout-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

@media (max-width: 1024px) {
  .lume-layout-main {
    margin-left: 0;
  }
}
</style>
