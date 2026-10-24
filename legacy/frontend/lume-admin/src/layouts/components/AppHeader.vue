<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, useAuthStore } from '@/stores'
import { message } from 'ant-design-vue'
import { LogOut, Home } from 'lucide-vue-next'

const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()

const userName = computed(() => {
  if (userStore.userInfo?.firstName && userStore.userInfo?.lastName) {
    return `${userStore.userInfo.firstName} ${userStore.userInfo.lastName}`
  }
  return userStore.userInfo?.email || 'User'
})

const userAvatar = computed(() => {
  if (userStore.userInfo?.avatar) {
    return userStore.userInfo.avatar
  }
  // Generate avatar from first letter
  const letter = userName.value.charAt(0).toUpperCase()
  return letter
})

const handleLogout = async () => {
  await authStore.logout()
}

const handleProfile = () => {
  router.push('/profile')
}

const menuItems = [
  {
    key: 'profile',
    label: 'Profile',
    onClick: handleProfile
  },
  {
    type: 'divider'
  },
  {
    key: 'logout',
    label: 'Logout',
    danger: true,
    onClick: handleLogout
  }
]
</script>

<template>
  <a-layout-header class="app-header">
    <div class="header-content">
      <div class="header-left">
        <h1 class="header-title">Dashboard</h1>
      </div>

      <div class="header-right">
        <a-dropdown :menu-props="{ items: menuItems }">
          <div class="user-dropdown">
            <div class="avatar">{{ userAvatar }}</div>
            <div class="user-info">
              <div class="user-name">{{ userName }}</div>
              <div class="user-email">{{ userStore.userInfo?.email }}</div>
            </div>
          </div>
        </a-dropdown>
      </div>
    </div>
  </a-layout-header>
</template>

<style scoped>
.app-header {
  background: white;
  border-bottom: 1px solid #f0f0f0;
  padding: 0 24px;
  display: flex;
  align-items: center;
  height: 64px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-left {
  flex: 1;
}

.header-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background 0.3s;
}

.user-dropdown:hover {
  background: #f5f5f5;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  line-height: 1.2;
}

.user-email {
  font-size: 12px;
  color: #999;
  line-height: 1.2;
}
</style>
