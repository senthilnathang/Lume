<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccessStore, type BackendMenuItem } from '@/stores'
import LucideIcon from '@/components/icons/LucideIcon.vue'

const route = useRoute()
const router = useRouter()
const accessStore = useAccessStore()

// Convert menus to a-menu items format
const convertToMenuItems = (menus: BackendMenuItem[]) => {
  return menus.map(menu => {
    const children = menu.children && menu.children.length > 0
      ? convertToMenuItems(menu.children)
      : null

    return {
      key: menu.path,
      label: menu.name,
      icon: menu.icon,
      path: menu.path,
      children,
      viewName: menu.viewName,
      module: menu.module
    }
  })
}

const menuItems = computed(() => {
  return convertToMenuItems(accessStore.accessMenus)
})

// Get current selected menu key from route
const selectedMenuKey = computed(() => {
  return route.path
})

// Handle menu click
const handleMenuClick = (item: any) => {
  if (item.path) {
    router.push(item.path)
  }
}

// Note: renderMenuLabel function removed - using a-menu's built-in rendering instead
</script>

<template>
  <a-layout-sider
    collapsible
    :collapsed="false"
    :width="240"
    :collapsed-width="80"
    theme="light"
    class="app-sidebar"
  >
    <div class="sidebar-logo">
      <div class="logo-box">Lume</div>
    </div>

    <a-menu
      v-if="menuItems.length > 0"
      :selected-keys="[selectedMenuKey]"
      :items="menuItems"
      mode="inline"
      @click="(e) => {
        const item = menuItems.find(m => m.key === e.key)
        if (item?.path) {
          router.push(item.path)
        }
      }"
      class="app-menu"
    />

    <div v-else class="sidebar-empty">
      <p>No menus available</p>
    </div>
  </a-layout-sider>
</template>

<style scoped>
.app-sidebar {
  background: #fafafa;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64px;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.logo-box {
  font-size: 20px;
  font-weight: bold;
  color: #667eea;
}

.app-menu {
  border-right: none;
}

.sidebar-empty {
  padding: 24px;
  text-align: center;
  color: #999;
  font-size: 12px;
}

:deep(.ant-menu-item) {
  padding-inline: 16px !important;
}

:deep(.ant-menu-submenu-title) {
  padding-inline: 16px !important;
}

:deep(.menu-icon) {
  margin-right: 8px;
  display: inline-block;
  width: 1em;
  height: 1em;
}

:deep(.menu-label) {
  display: inline-block;
}
</style>
