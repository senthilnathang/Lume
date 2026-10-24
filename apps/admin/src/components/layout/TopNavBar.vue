<template>
  <nav class="lume-topnav">
    <template v-for="menu in menus" :key="menu.key || menu.path">
      <router-link
        v-if="menu.path"
        :to="menu.path"
        class="lume-topnav-link"
        active-class="active"
      >
        {{ menu.title || menu.label }}
      </router-link>
      <a-dropdown v-else :trigger="['hover']">
        <span class="lume-topnav-link">{{ menu.title || menu.label }} ▾</span>
        <template #overlay>
          <a-menu>
            <a-menu-item v-for="item in menu.children || menu.items || []" :key="item.key || item.path || item.title">
              <router-link :to="item.path || '/'">{{ item.title || item.label }}</router-link>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </template>
  </nav>
</template>
<script setup lang="ts">
interface NavItem {
  key?: string;
  path?: string;
  title?: string;
  label?: string;
  children?: NavItem[];
  items?: NavItem[];
}

withDefaults(defineProps<{
  menus?: NavItem[];
}>(), { menus: () => [] });
</script>
<style scoped>
.lume-topnav {
  display: flex;
  gap: 4px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
  overflow-x: auto;
}
.lume-topnav-link {
  padding: 10px 14px;
  font-size: 14px;
  color: #555;
  white-space: nowrap;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.lume-topnav-link:hover {
  color: #1677ff;
}
.lume-topnav-link.active {
  color: #1677ff;
  border-bottom-color: #1677ff;
  font-weight: 600;
}
</style>
