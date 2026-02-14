<template>
  <div class="lume-layout">
    <Sidebar v-if="isAuthenticated" :menus="menus" :collapsed="sidebarCollapsed" @toggle="toggleSidebar" />
    <div class="lume-layout-main" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <Header
        v-if="isAuthenticated"
        :user="user"
        :menus="menus"
        @toggle-sidebar="toggleSidebar"
        @logout="handleLogout"
      />
      <div class="lume-layout-content">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { usePermissionStore } from '@/store/permission';
import Sidebar from '@/components/layout/Sidebar.vue';
import Header from '@/components/layout/Header.vue';

const router = useRouter();
const authStore = useAuthStore();
const permissionStore = usePermissionStore();

const sidebarCollapsed = ref(false);

const isAuthenticated = computed(() => authStore.isAuthenticated);
const user = computed(() => authStore.userInfo);
const menus = computed(() => permissionStore.menus as any[]);

// Fetch permissions and menus on mount
onMounted(async () => {
  if (authStore.token) {
    await permissionStore.fetchPermissions();
    await permissionStore.fetchMenus();
  }
});

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

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
  margin-left: 260px;
  transition: margin-left 0.3s ease;
  display: flex;
  flex-direction: column;
}

.lume-layout-main.sidebar-collapsed {
  margin-left: 72px;
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
