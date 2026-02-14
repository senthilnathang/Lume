/**
 * Store exports for Dynamic Module Views
 * Provides reactive state management
 */

import { ref, reactive, computed } from 'vue';

// Re-export permission store (use relative path within same directory)
export { usePermissionStore, PERMISSIONS } from './permission.js';

// =============================================================================
// Entity Store (generic reusable entity state management)
// =============================================================================
const entityStores = new Map();

export function useEntityStore(entityName = 'default') {
  // Return existing store if already created for this entity
  if (entityStores.has(entityName)) {
    return entityStores.get(entityName);
  }

  const state = reactive({
    currentItem: null,
    items: [],
    loading: false,
    error: null,
  });

  const currentItem = computed(() => state.currentItem);
  const items = computed(() => state.items);
  const loading = computed(() => state.loading);
  const error = computed(() => state.error);

  function setCurrentItem(item) {
    state.currentItem = item;
  }

  function setItems(list) {
    state.items = list;
  }

  function setLoading(value) {
    state.loading = value;
  }

  function setError(err) {
    state.error = err;
  }

  function clearCurrentItem() {
    state.currentItem = null;
  }

  function clearAll() {
    state.currentItem = null;
    state.items = [];
    state.error = null;
  }

  const store = {
    currentItem,
    items,
    loading,
    error,
    setCurrentItem,
    setItems,
    setLoading,
    setError,
    clearCurrentItem,
    clearAll,
  };

  entityStores.set(entityName, store);
  return store;
}

// =============================================================================
// User Store
// =============================================================================
const userState = reactive({
  user: null,
  isAuthenticated: false,
});

export function useUserStore() {
  const user = computed(() => userState.user);
  const isAuthenticated = computed(() => userState.isAuthenticated);

  function setUser(userData) {
    userState.user = userData;
    userState.isAuthenticated = !!userData;
  }

  function clearUser() {
    userState.user = null;
    userState.isAuthenticated = false;
  }

  // Initialize from localStorage
  function init() {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        userState.user = JSON.parse(stored);
        userState.isAuthenticated = true;
      }
    } catch (e) {
      console.warn('Failed to load user from storage');
    }
  }

  return {
    user,
    isAuthenticated,
    setUser,
    clearUser,
    init,
  };
}

// =============================================================================
// App Store (global app state)
// =============================================================================
const appState = reactive({
  sidebarCollapsed: false,
  theme: 'light',
  locale: 'en',
});

export function useAppStore() {
  const sidebarCollapsed = computed(() => appState.sidebarCollapsed);
  const theme = computed(() => appState.theme);
  const locale = computed(() => appState.locale);

  function toggleSidebar() {
    appState.sidebarCollapsed = !appState.sidebarCollapsed;
  }

  function setSidebarCollapsed(value) {
    appState.sidebarCollapsed = value;
  }

  function setTheme(value) {
    appState.theme = value;
  }

  function setLocale(value) {
    appState.locale = value;
  }

  return {
    sidebarCollapsed,
    theme,
    locale,
    toggleSidebar,
    setSidebarCollapsed,
    setTheme,
    setLocale,
  };
}
