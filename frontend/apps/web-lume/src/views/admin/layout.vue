<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Layout, Menu, Avatar, Dropdown, Button } from 'ant-design-vue';

const { Header, Sider, Content } = Layout;
const { Item: MenuItem } = Menu;
import { 
  DashboardOutlined, 
  CameraOutlined, 
  FileTextOutlined, 
  TeamOutlined,
  HeartOutlined,
  MessageOutlined,
  DollarOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FolderOutlined,
  SettingOutlined,
  AppstoreOutlined,
  BarsOutlined,
  FileOutlined,
  CalendarOutlined,
  MailOutlined
} from '@ant-design/icons-vue';
import { useAuthStore } from '@/store/auth';
import { usePermissionStore, type MenuItem as PermissionMenuItem } from '@/store/permission';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const permissionStore = usePermissionStore();

const collapsed = ref(false);

// Icon mapping from string names to Ant Design Vue icon components
const iconMapping: Record<string, any> = {
  'dashboard': DashboardOutlined,
  'home': DashboardOutlined,
  'users': TeamOutlined,
  'user': UserOutlined,
  'donations': DollarOutlined,
  'money': DollarOutlined,
  'heart': HeartOutlined,
  'documents': FileTextOutlined,
  'file': FileOutlined,
  'folder': FolderOutlined,
  'team': TeamOutlined,
  'messages': MailOutlined,
  'mail': MailOutlined,
  'message': MessageOutlined,
  'activities': CameraOutlined,
  'activity': CameraOutlined,
  'calendar': CalendarOutlined,
  'settings': SettingOutlined,
  'cog': SettingOutlined,
  'audit': FileTextOutlined,
  'shield': SettingOutlined,
  'code': AppstoreOutlined,
  'list': BarsOutlined,
  'list-ol': BarsOutlined,
  'media': CameraOutlined,
  'image': CameraOutlined,
  'picture': CameraOutlined,
  'circle': AppstoreOutlined,
  'lucide:home': DashboardOutlined,
  'lucide:users': TeamOutlined,
  'lucide:calendar': CalendarOutlined,
  'lucide:heart': HeartOutlined,
  'lucide:settings': SettingOutlined,
  'lucide:activity': CameraOutlined,
  'lucide:message-square': MessageOutlined,
  'lucide:image': CameraOutlined,
  'lucide:folder': FolderOutlined,
};

// Get icon component from string name
const getIconComponent = (iconName?: string) => {
  if (!iconName) return AppstoreOutlined;
  return iconMapping[iconName] || AppstoreOutlined;
};

// Transform permission store menus to Ant Design Menu format
const menuItems = computed(() => {
  const menus = permissionStore.filteredMenus;
  
  return menus.map((menu: PermissionMenuItem) => ({
    key: menu.path,
    icon: getIconComponent(menu.icon),
    label: menu.title || menu.name,
    children: menu.children?.map((child: PermissionMenuItem) => ({
      key: child.path,
      icon: getIconComponent(child.icon),
      label: child.title || child.name,
    }))
  }));
});

const userMenuItems = [
  { key: 'profile', icon: UserOutlined, label: 'Profile' },
  { type: 'divider' as const },
  { key: 'logout', icon: LogoutOutlined, label: 'Logout' }
];

const handleMenuClick = ({ key }: { key: string }) => {
  if (key === 'logout') {
    authStore.logout();
    router.push('/login');
  } else {
    router.push(key);
  }
};

const toggleCollapsed = () => {
  collapsed.value = !collapsed.value;
};

// Fetch menus on mount if not already loaded
if (!permissionStore.menusLoaded && authStore.isAuthenticated) {
  permissionStore.fetchMenus();
}
</script>

<template>
  <Layout class="admin-layout">
    <Sider 
      v-model:collapsed="collapsed" 
      :width="260"
      class="admin-sider"
      theme="light"
    >
      <div class="logo">
        <span v-if="!collapsed">GAWDESY</span>
        <span v-else>G</span>
      </div>
      
      <Menu
        mode="inline"
        :selectedKeys="[route.path]"
        :openKeys="[]"
        class="admin-menu"
        @click="handleMenuClick"
      >
        <MenuItem v-for="item in menuItems" :key="item.key">
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
        </MenuItem>
      </Menu>
    </Sider>

    <Layout>
      <Header class="admin-header">
        <div class="header-left">
          <Button type="text" @click="toggleCollapsed">
            <MenuFoldOutlined v-if="!collapsed" />
            <MenuUnfoldOutlined v-else />
          </Button>
          <span class="page-title">{{ route.meta.title || 'Admin' }}</span>
        </div>

        <div class="header-right">
          <Dropdown :menu="{ items: userMenuItems }" placement="bottomRight">
            <div class="user-dropdown">
              <Avatar style="background-color: var(--primary-color)">
                {{ authStore.user?.name?.charAt(0) || 'A' }}
              </Avatar>
              <span v-if="!collapsed" class="user-name">{{ authStore.user?.name }}</span>
            </div>
          </Dropdown>
        </div>
      </Header>

      <Content class="admin-content">
        <RouterView />
      </Content>
    </Layout>
  </Layout>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
}

.admin-sider {
  box-shadow: 2px 0 8px rgba(0,0,0,0.05);
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
  background: white;
  border-bottom: 1px solid var(--border-color);
}

.admin-menu {
  border-right: none !important;
  padding: 16px 0;
}

.admin-menu :deep(.ant-menu-item) {
  margin: 4px 12px;
  border-radius: 8px;
}

.admin-menu :deep(.ant-menu-item-selected) {
  background: rgba(46, 125, 50, 0.1) !important;
  color: var(--primary-color) !important;
}

.admin-header {
  background: white;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.user-dropdown:hover {
  background: var(--background-color);
}

.user-name {
  font-weight: 500;
}

.admin-content {
  margin: 24px;
  background: var(--background-color);
  min-height: calc(100vh - 112px);
  border-radius: var(--radius-md);
  padding: 24px;
}
</style>
