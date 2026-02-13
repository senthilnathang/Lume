<template>
  <div class="lume-breadcrumb">
    <span v-for="(item, index) in breadcrumbs" :key="item.path" class="breadcrumb-item">
      <router-link v-if="index < breadcrumbs.length - 1" :to="item.path" class="breadcrumb-link">
        <span class="lume-breadcrumb-icon" v-if="item.icon">
          <component :is="getIconComponent(item.icon)" />
        </span>
        {{ item.title }}
      </router-link>
      <span v-else class="breadcrumb-current">
        <span class="lume-breadcrumb-icon" v-if="item.icon">
          <component :is="getIconComponent(item.icon)" />
        </span>
        {{ item.title }}
      </span>
      <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-separator">/</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { usePermissionStore, type MenuItem } from '@/store/permission';
import * as antIcons from '@ant-design/icons-vue';

const route = useRoute();
const permissionStore = usePermissionStore();

interface BreadcrumbItem {
  title: string;
  path: string;
  icon?: string;
}

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const items: BreadcrumbItem[] = [];
  
  // Always add Home
  items.push({
    title: 'Home',
    path: '/dashboard',
    icon: 'HomeOutlined'
  });
  
  const currentPath = route.path;
  const menus = permissionStore.menus;
  
  // Find the current menu item and its parent
  const findMenuAndParent = (menuList: MenuItem[], parent?: MenuItem): { current?: MenuItem; parent?: MenuItem } => {
    for (const menu of menuList) {
      if (menu.path === currentPath || currentPath.startsWith(menu.path + '/')) {
        if (menu.path === currentPath) {
          return { current: menu, parent };
        }
        if (menu.children && menu.children.length > 0) {
          const found = findMenuAndParent(menu.children, menu);
          if (found.current) return found;
        }
      }
    }
    return {};
  };
  
  const found = findMenuAndParent(menus);
  
  if (found.parent) {
    items.push({
      title: found.parent.title || found.parent.name,
      path: found.parent.path,
      icon: found.parent.icon
    });
  }
  
  if (found.current) {
    items.push({
      title: found.current.title || found.current.name,
      path: found.current.path,
      icon: found.current.icon
    });
  } else {
    // Use route meta as fallback
    const routeTitle = route.meta?.title as string;
    if (routeTitle && routeTitle !== 'Dashboard') {
      items.push({
        title: routeTitle,
        path: currentPath
      });
    }
  }
  
  return items;
});

const getIconComponent = (iconName: string) => {
  // Handle lucide icons (e.g., "lucide:settings")
  if (iconName?.startsWith('lucide:')) {
    const name = iconName.replace('lucide:', '');
    // Map common lucide names to ant design icons
    const iconMap: Record<string, any> = {
      'settings': 'SettingOutlined',
      'users': 'UserOutlined',
      'user': 'UserOutlined',
      'shield': 'SafetyCertificateOutlined',
      'key': 'KeyOutlined',
      'menu': 'MenuOutlined',
      'package': 'AppstoreOutlined',
      'home': 'HomeOutlined',
      'dashboard': 'DashboardOutlined',
      'zap': 'ThunderboltOutlined',
      'activity': 'ActivityOutlined',
      'folder': 'FolderOutlined',
      'file': 'FileOutlined',
      'bell': 'BellOutlined',
      'mail': 'MailOutlined',
      'database': 'DatabaseOutlined',
      'server': 'ServerOutlined',
      'clock': 'ClockCircleOutlined',
      'check-circle': 'CheckCircleOutlined',
      'git-branch': 'BranchOutlined',
      'git-merge': 'MergeOutlined',
      'book-open': 'BookOutlined',
      'list-ordered': 'OrderedListOutlined',
      'shield-check': 'CheckSquareOutlined',
      'smartphone': 'MobileOutlined',
      'lock': 'LockOutlined',
      'users-round': 'TeamOutlined'
    };
    return iconMap[name] || 'FolderOutlined';
  }
  
  // Handle ant design icons
  return antIcons[iconName] || antIcons.FolderOutlined;
};
</script>

<style scoped>
.lume-breadcrumb {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.lume-breadcrumb :deep(.ant-breadcrumb-link) {
  color: #64748b;
  font-size: 14px;
  transition: color 0.2s;
}

.lume-breadcrumb :deep(.ant-breadcrumb-link:hover) {
  color: #1890ff;
}

.lume-breadcrumb-current {
  color: #1e293b !important;
  font-weight: 500;
}

.lume-breadcrumb-icon {
  display: inline-flex;
  align-items: center;
  margin-right: 4px;
}

.lume-breadcrumb-icon :deep(svg) {
  width: 14px;
  height: 14px;
}
</style>
