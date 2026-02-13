<template>
  <header class="lume-header">
    <div class="lume-header-left">
      <button class="lume-menu-toggle" @click="$emit('toggle-sidebar')">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      
      <div class="lume-breadcrumb">
        <span class="breadcrumb-item">Dashboard</span>
      </div>
    </div>

    <div class="lume-header-center">
      <div class="lume-search" @click="openSearch">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span>Search...</span>
        <kbd class="search-shortcut">⌘K</kbd>
      </div>
    </div>

    <div class="lume-header-right">
      <div class="lume-header-actions">
        <button class="lume-action-btn" @click="toggleNotifications">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span v-if="unreadCount > 0" class="lume-badge">{{ unreadCount }}</span>
        </button>

        <button class="lume-action-btn" @click="toggleFullscreen">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
        </button>

        <button class="lume-action-btn" @click="toggleTheme">
          <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>
      </div>

      <div class="lume-user-dropdown" ref="userDropdownRef">
        <button class="lume-user-btn" @click="toggleUserDropdown">
          <div class="lume-user-avatar">
            <img v-if="userAvatar" :src="userAvatar" :alt="userName" />
            <span v-else class="avatar-fallback">{{ userInitials }}</span>
          </div>
          <div class="lume-user-info">
            <span class="lume-user-name">{{ userName }}</span>
            <span class="lume-user-role">{{ userRole }}</span>
          </div>
          <svg class="dropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        <div v-if="showUserDropdown" class="lume-dropdown-menu">
          <div class="dropdown-header">
            <div class="dropdown-user-info">
              <strong>{{ userName }}</strong>
              <span>{{ userEmail }}</span>
            </div>
          </div>
          <div class="dropdown-divider"></div>
          <router-link to="/profile" class="dropdown-item" @click="showUserDropdown = false">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Profile
          </router-link>
          <router-link to="/settings" class="dropdown-item" @click="showUserDropdown = false">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Settings
          </router-link>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item logout" @click="handleLogout">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

interface UserInfo {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar?: string;
}

interface MenuItem {
  id: number;
  title: string;
  path: string;
  icon?: string;
}

const props = defineProps<{
  user: UserInfo | null;
  menus: MenuItem[];
}>();

const showUserDropdown = ref(false);
const isDark = ref(false);
const unreadCount = ref(3);
const userDropdownRef = ref<HTMLElement | null>(null);

const userName = computed(() => {
  if (props.user?.first_name || props.user?.last_name) {
    return `${props.user.first_name} ${props.user.last_name}`.trim();
  }
  return props.user?.email?.split('@')[0] || 'User';
});

const userEmail = computed(() => props.user?.email || '');
const userRole = computed(() => props.user?.role || 'User');
const userAvatar = computed(() => props.user?.avatar);

const userInitials = computed(() => {
  const first = props.user?.first_name?.charAt(0) || '';
  const last = props.user?.last_name?.charAt(0) || '';
  return (first + last).toUpperCase() || props.user?.email?.charAt(0)?.toUpperCase() || 'U';
});

const toggleUserDropdown = () => {
  showUserDropdown.value = !showUserDropdown.value;
};

const toggleNotifications = () => {
  console.log('Toggle notifications');
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

const toggleTheme = () => {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle('dark', isDark.value);
};

const openSearch = () => {
  console.log('Open search modal');
};

const handleLogout = () => {
  showUserDropdown.value = false;
  emit('logout');
};

const emit = defineEmits<{
  'toggle-sidebar': [];
  logout: [];
}>();

const handleClickOutside = (event: MouseEvent) => {
  if (userDropdownRef.value && !userDropdownRef.value.contains(event.target as Node)) {
    showUserDropdown.value = false;
  }
};

const handleKeyboard = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault();
    openSearch();
  }
  if (event.key === 'Escape') {
    showUserDropdown.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeyboard);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyboard);
});
</script>

<style scoped>
.lume-header {
  height: 64px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 50;
}

.lume-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.lume-menu-toggle {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.2s;
}

.lume-menu-toggle:hover {
  background: #f3f4f6;
  color: #111827;
}

.lume-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
}

.breadcrumb-item {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
}

.lume-header-center {
  flex: 1;
  max-width: 480px;
  margin: 0 24px;
}

.lume-search {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #f3f4f6;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.lume-search:hover {
  background: #e5e7eb;
}

.lume-search svg {
  color: #9ca3af;
  flex-shrink: 0;
}

.lume-search span {
  flex: 1;
  font-size: 14px;
  color: #6b7280;
}

.search-shortcut {
  padding: 2px 6px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 11px;
  font-family: inherit;
  color: #9ca3af;
}

.lume-header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.lume-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.lume-action-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.2s;
  position: relative;
}

.lume-action-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.lume-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 600;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lume-user-dropdown {
  position: relative;
}

.lume-user-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px 6px 6px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.lume-user-btn:hover {
  background: #f3f4f6;
}

.lume-user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lume-user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  color: white;
  font-size: 14px;
  font-weight: 600;
}

.lume-user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.lume-user-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  line-height: 1.2;
}

.lume-user-role {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.2;
}

.dropdown-arrow {
  color: #9ca3af;
  margin-left: 4px;
}

.lume-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 240px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
  padding: 8px;
  animation: dropdownIn 0.2s ease;
}

@keyframes dropdownIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-header {
  padding: 12px;
}

.dropdown-user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dropdown-user-info strong {
  font-size: 14px;
  color: #111827;
}

.dropdown-user-info span {
  font-size: 12px;
  color: #6b7280;
}

.dropdown-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 8px 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  color: #374151;
  text-decoration: none;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.15s;
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
}

.dropdown-item:hover {
  background: #f3f4f6;
  color: #111827;
}

.dropdown-item.logout {
  color: #dc2626;
}

.dropdown-item.logout:hover {
  background: #fef2f2;
}

@media (max-width: 1024px) {
  .lume-header-center {
    display: none;
  }

  .lume-user-info {
    display: none;
  }

  .dropdown-arrow {
    display: none;
  }
}
</style>
