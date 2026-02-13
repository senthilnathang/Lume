<template>
  <div class="app-layout">
    <Sidebar
      v-if="isAuthenticated"
      :menus="menus"
      :collapsed="sidebarCollapsed"
      @toggle="toggleSidebar"
    />
    <div class="main-content" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <Header
        v-if="isAuthenticated"
        :user="userInfo"
        :menus="menus"
        @toggle-sidebar="toggleSidebar"
        @logout="handleLogout"
      />
      <main class="page-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
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
const userInfo = computed(() => authStore.userInfo);
const menus = computed(() => permissionStore.menus);

// Fetch menus and permissions on mount if has token (even without userInfo)
onMounted(async () => {
  // Check if user has a token (may still need userInfo)
  if (authStore.token) {
    // If no userInfo yet, we still need to fetch menus
    // The permissions will be granted based on role
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
.app-layout {
  display: flex;
  min-height: 100vh;
  background: #f1f5f9;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 260px;
  transition: margin-left 0.3s ease;
}

.main-content.sidebar-collapsed {
  margin-left: 72px;
}

.page-content {
  flex: 1;
  overflow-y: auto;
}

@media (max-width: 1024px) {
  .main-content {
    margin-left: 0;
  }
}
</style>
