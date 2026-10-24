import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export interface TabItem {
  key: string;
  title: string;
  pinned?: boolean;
}

const STORAGE_KEY = 'lume-tabs';
const HOME_TAB: TabItem = { key: '/dashboard', title: 'Dashboard', pinned: true };

function loadTabs(): TabItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length) {
      const tabs = parsed.filter((t) => t && typeof t.key === 'string');
      if (!tabs.some((t) => t.key === HOME_TAB.key)) {
        tabs.unshift({ ...HOME_TAB });
      }
      return tabs;
    }
  } catch {
    /* corrupted storage */
  }
  return [{ ...HOME_TAB }];
}

export const useTabBarStore = defineStore('tabbar', () => {
  const tabs = ref<TabItem[]>(loadTabs());
  const refreshKey = ref(0);

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs.value));
    } catch {
      /* storage unavailable */
    }
  };

  const openTab = (key: string, title: string) => {
    if (!key || key === '/login' || key === '/403' || key === '/404') return;
    if (!tabs.value.some((t) => t.key === key)) {
      tabs.value.push({ key, title: title || key });
      persist();
    }
  };

  const closeTab = (key: string): string | null => {
    const index = tabs.value.findIndex((t) => t.key === key);
    if (index === -1 || tabs.value[index].pinned) return null;
    tabs.value.splice(index, 1);
    persist();
    const fallback = tabs.value[Math.min(index, tabs.value.length - 1)];
    return fallback ? fallback.key : null;
  };

  const closeOtherTabs = (key: string) => {
    tabs.value = tabs.value.filter((t) => t.pinned || t.key === key);
    persist();
  };

  const closeLeftTabs = (key: string) => {
    const index = tabs.value.findIndex((t) => t.key === key);
    if (index === -1) return;
    tabs.value = tabs.value.filter((t, i) => t.pinned || i >= index);
    persist();
  };

  const closeRightTabs = (key: string) => {
    const index = tabs.value.findIndex((t) => t.key === key);
    if (index === -1) return;
    tabs.value = tabs.value.filter((t, i) => t.pinned || i <= index);
    persist();
  };

  const closeAllTabs = () => {
    tabs.value = tabs.value.filter((t) => t.pinned);
    persist();
  };

  const togglePin = (key: string) => {
    const tab = tabs.value.find((t) => t.key === key);
    if (!tab) return;
    if (tab.key === HOME_TAB.key) return;
    tab.pinned = !tab.pinned;
    persist();
  };

  const refreshTab = () => {
    refreshKey.value += 1;
  };

  const tabCount = computed(() => tabs.value.length);

  return {
    tabs,
    refreshKey,
    tabCount,
    openTab,
    closeTab,
    closeOtherTabs,
    closeLeftTabs,
    closeRightTabs,
    closeAllTabs,
    togglePin,
    refreshTab,
  };
});
