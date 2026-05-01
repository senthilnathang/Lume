<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1 class="dashboard-title">Dashboard</h1>
      <p class="dashboard-subtitle">Welcome to Lume Admin {{ userStore.userInfo?.firstName }}</p>
    </div>

    <div class="stats-grid">
      <a-card class="stat-card">
        <template #title>
          <span class="stat-label">Installed Modules</span>
        </template>
        <div class="stat-value">{{ accessStore.accessMenus.length }}</div>
      </a-card>

      <a-card class="stat-card">
        <template #title>
          <span class="stat-label">Permissions</span>
        </template>
        <div class="stat-value">{{ accessStore.accessCodes.length }}</div>
      </a-card>

      <a-card class="stat-card">
        <template #title>
          <span class="stat-label">User Role</span>
        </template>
        <div class="stat-value capitalize">{{ userStore.userInfo?.role || 'User' }}</div>
      </a-card>
    </div>

    <a-card class="quick-links-card">
      <template #title>Quick Links</template>
      <div class="quick-links">
        <a-button
          v-for="menu in quickLinks"
          :key="menu.path"
          type="default"
          @click="navigate(menu.path)"
          class="quick-link-btn"
        >
          {{ menu.name }}
        </a-button>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAccessStore } from '@/stores/access'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const accessStore = useAccessStore()
const userStore = useUserStore()

const quickLinks = computed(() => {
  return accessStore.accessMenus.slice(0, 6)
})

const navigate = (path: string) => {
  router.push(path)
}
</script>

<style scoped>
.dashboard {
  padding: 24px;
}

.dashboard-header {
  margin-bottom: 32px;
}

.dashboard-title {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: #333;
}

.dashboard-subtitle {
  margin: 8px 0 0 0;
  color: #666;
  font-size: 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #667eea;
  margin-top: 12px;
}

.capitalize {
  text-transform: capitalize;
}

.quick-links-card {
  margin-top: 24px;
}

.quick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.quick-link-btn {
  flex: 0 1 auto;
}
</style>
