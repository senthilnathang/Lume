<template>
  <aside
    class="lume-sidebar"
    :class="{ collapsed: isCollapsed, 'expand-on-hover': collapsed }"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <div class="lume-sidebar-header">
      <div class="lume-logo">
        <div class="lume-logo-icon">
          <LayoutDashboard :size="20" />
        </div>
        <span v-if="!isCollapsed" class="lume-logo-text">Lume</span>
      </div>
    </div>

    <nav class="lume-sidebar-nav">
      <template v-for="(group, gi) in menuGroups" :key="group.id">
        <div v-if="group.title && !isCollapsed" class="lume-nav-group-title">
          {{ group.title }}
        </div>
        <div v-else-if="gi > 0" class="lume-nav-divider" />
        <ul class="lume-nav-list">
          <template v-for="item in group.items" :key="item.path">

            <!-- COLLAPSED MODE -->
            <template v-if="isCollapsed">
              <!-- Parent with children: popover -->
              <li v-if="item.children?.length && !item.hideInMenu">
                <a-popover placement="right" trigger="hover" overlay-class-name="lume-popup-overlay">
                  <template #content>
                    <div class="lume-popup-menu">
                      <div class="lume-popup-title">{{ item.name || item.title }}</div>
                      <router-link
                        v-for="child in visibleChildren(item)"
                        :key="child.path"
                        :to="child.path"
                        class="lume-popup-item"
                        :class="{ active: isActive(child.path) }"
                      >
                        <component :is="resolveIcon(child.icon)" :size="14" />
                        {{ child.name || child.title }}
                      </router-link>
                    </div>
                  </template>
                  <button class="lume-nav-item" :class="{ active: isChildActive(item) }">
                    <component :is="resolveIcon(item.icon)" :size="20" class="lume-nav-icon" />
                  </button>
                </a-popover>
              </li>
              <!-- Leaf item: tooltip -->
              <li v-else-if="!item.hideInMenu">
                <a-tooltip :title="item.name || item.title" placement="right">
                  <router-link
                    :to="item.path"
                    class="lume-nav-item"
                    :class="{ active: isActive(item.path) }"
                  >
                    <component :is="resolveIcon(item.icon)" :size="20" class="lume-nav-icon" />
                  </router-link>
                </a-tooltip>
              </li>
            </template>

            <!-- EXPANDED MODE -->
            <template v-else>
              <!-- Leaf item (no children) -->
              <li v-if="!item.children?.length && !item.hideInMenu">
                <router-link
                  :to="item.path"
                  class="lume-nav-item"
                  :class="{ active: isActive(item.path) }"
                >
                  <component :is="resolveIcon(item.icon)" :size="20" class="lume-nav-icon" />
                  <span class="lume-nav-label">{{ item.name || item.title }}</span>
                  <span v-if="item.badge" class="lume-nav-badge" :class="item.badgeType || 'dot'">
                    {{ item.badgeType === 'dot' ? '' : item.badge }}
                  </span>
                </router-link>
              </li>
              <!-- Parent item (has children) -->
              <li v-else-if="!item.hideInMenu" class="lume-nav-submenu">
                <button
                  class="lume-nav-item"
                  :class="{ active: isChildActive(item) }"
                  @click="toggleSubmenu(item.path)"
                >
                  <component :is="resolveIcon(item.icon)" :size="20" class="lume-nav-icon" />
                  <span class="lume-nav-label">{{ item.name || item.title }}</span>
                  <span v-if="item.badge" class="lume-nav-badge" :class="item.badgeType || 'dot'">
                    {{ item.badgeType === 'dot' ? '' : item.badge }}
                  </span>
                  <ChevronDown
                    :size="16"
                    class="lume-nav-arrow"
                    :class="{ rotated: openMenus.has(item.path) }"
                  />
                </button>
                <transition name="submenu">
                  <ul v-show="openMenus.has(item.path)" class="lume-nav-children">
                    <li v-for="child in visibleChildren(item)" :key="child.path">
                      <router-link
                        :to="child.path"
                        class="lume-nav-item child-item"
                        :class="{ active: isActive(child.path) }"
                      >
                        <component :is="resolveIcon(child.icon)" :size="16" class="lume-nav-icon" />
                        <span class="lume-nav-label">{{ child.name || child.title }}</span>
                      </router-link>
                    </li>
                  </ul>
                </transition>
              </li>
            </template>

          </template>
        </ul>
      </template>
    </nav>

    <div class="lume-sidebar-footer">
      <button class="lume-collapse-btn" @click="$emit('toggle')">
        <component :is="isCollapsed ? ChevronsRight : ChevronsLeft" :size="18" />
        <span v-if="!isCollapsed">Collapse</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import * as lucideIcons from 'lucide-vue-next';
const { ChevronDown, ChevronsLeft, ChevronsRight, LayoutDashboard } = lucideIcons;

export interface MenuItem {
  name: string;
  path: string;
  title?: string;
  icon?: string;
  permission?: string;
  module?: string;
  hideInMenu?: boolean;
  children?: MenuItem[];
  badge?: string | number;
  badgeType?: 'dot' | 'count';
}

interface MenuGroup {
  id: string;
  title: string;
  items: MenuItem[];
}

const props = defineProps<{
  menus: MenuItem[];
  collapsed: boolean;
}>();

defineEmits<{
  toggle: [];
}>();

const route = useRoute();
const hovering = ref(false);
const openMenus = ref<Set<string>>(new Set());

const isCollapsed = computed(() => props.collapsed && !hovering.value);

/**
 * Icon resolver — handles "lucide:xxx", plain names, and kebab-case.
 * Converts to PascalCase and looks up in lucide-vue-next icons object.
 */
function resolveIcon(name?: string) {
  if (!name) return (lucideIcons as Record<string, any>)['Circle'] || LayoutDashboard;
  const key = name.replace('lucide:', '');
  const pascal = key.replace(/(^|[-_])(\w)/g, (_: string, __: string, c: string) => c.toUpperCase());
  return (lucideIcons as Record<string, any>)[pascal] || (lucideIcons as Record<string, any>)['Circle'] || LayoutDashboard;
}

// --- Phase 3: Menu grouping by category ---
const menuCategories = [
  { id: 'main', title: 'Navigation', paths: ['/dashboard', '/activities', '/team', '/donations', '/messages'] },
  { id: 'content', title: 'Content', paths: ['/documents', '/media'] },
  { id: 'admin', title: 'Administration', paths: ['/settings', '/audit', '/access-control', '/security'] },
  { id: 'system', title: 'System', paths: ['/lume', '/automation', '/features'] },
];

const menuGroups = computed((): MenuGroup[] => {
  const allMenus = props.menus.filter(menu => !menu.hideInMenu);
  if (allMenus.length === 0) return [];

  const categorized = menuCategories.map(cat => ({
    ...cat,
    items: allMenus.filter(menu =>
      menu.path && cat.paths.some(p => menu.path.startsWith(p))
    )
  })).filter(cat => cat.items.length > 0);

  const categorizedPaths = new Set(categorized.flatMap(c => c.items.map(i => i.path)));
  const uncategorized = allMenus.filter(m => !categorizedPaths.has(m.path));
  if (uncategorized.length) {
    categorized.push({ id: 'other', title: 'Other', items: uncategorized, paths: [] });
  }

  return categorized;
});

// --- Phase 6: Active state helpers ---
const isActive = (path: string): boolean => {
  return route.path === path || route.path.startsWith(path + '/');
};

const isChildActive = (item: MenuItem): boolean => {
  return item.children?.some(c => isActive(c.path)) || isActive(item.path);
};

const visibleChildren = (item: MenuItem): MenuItem[] => {
  return item.children?.filter(c => !c.hideInMenu) || [];
};

// --- Phase 2: Submenu toggle with accordion ---
function toggleSubmenu(path: string) {
  if (openMenus.value.has(path)) {
    openMenus.value.delete(path);
  } else {
    openMenus.value.clear();
    openMenus.value.add(path);
  }
  openMenus.value = new Set(openMenus.value);
}

// Auto-expand the submenu containing the active route
watch(() => route.path, (path) => {
  for (const group of menuGroups.value) {
    for (const menu of group.items) {
      if (menu.children?.some(c => path.startsWith(c.path))) {
        openMenus.value.add(menu.path);
        openMenus.value = new Set(openMenus.value);
      }
    }
  }
}, { immediate: true });

// Scroll to active item on mount
onMounted(() => {
  nextTick(() => {
    const activeEl = document.querySelector('.lume-nav-item.active');
    activeEl?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
});
</script>

<style scoped>
.lume-sidebar {
  width: 260px;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  z-index: 100;
}

.lume-sidebar.collapsed {
  width: 72px;
}

.lume-sidebar.expand-on-hover:not(.collapsed) {
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
}

.lume-sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.lume-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lume-logo-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.lume-logo-text {
  font-size: 20px;
  font-weight: 700;
  color: white;
  white-space: nowrap;
}

.lume-sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

/* Custom scrollbar */
.lume-sidebar-nav::-webkit-scrollbar { width: 4px; }
.lume-sidebar-nav::-webkit-scrollbar-track { background: transparent; }
.lume-sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}
.lume-sidebar-nav::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.lume-nav-group-title {
  padding: 16px 20px 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.35);
}

.lume-nav-divider {
  height: 1px;
  margin: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
}

.lume-nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.lume-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  color: rgba(255, 255, 255, 0.65);
  text-decoration: none;
  transition: all 0.2s;
  border: none;
  background: none;
  width: 100%;
  font-size: 14px;
  cursor: pointer;
  border-left: 3px solid transparent;
  font-family: inherit;
}

.lume-nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
}

.lume-nav-item.active {
  background: rgba(79, 70, 229, 0.15);
  color: white;
  border-left-color: #4f46e5;
}

.lume-nav-submenu > .lume-nav-item.active {
  background: rgba(79, 70, 229, 0.08);
  border-left-color: transparent;
}

.lume-nav-icon {
  flex-shrink: 0;
}

.lume-nav-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Submenu arrow */
.lume-nav-arrow {
  margin-left: auto;
  flex-shrink: 0;
  transition: transform 0.2s ease;
  opacity: 0.5;
}

.lume-nav-arrow.rotated {
  transform: rotate(180deg);
}

/* Children list */
.lume-nav-children {
  list-style: none;
  padding: 0;
  margin: 0;
}

.lume-nav-item.child-item {
  padding-left: 48px;
  font-size: 13px;
  padding-top: 8px;
  padding-bottom: 8px;
}

/* Submenu transition */
.submenu-enter-active, .submenu-leave-active {
  transition: max-height 0.3s ease, opacity 0.2s ease;
  overflow: hidden;
}
.submenu-enter-from, .submenu-leave-to {
  max-height: 0;
  opacity: 0;
}
.submenu-enter-to, .submenu-leave-from {
  max-height: 500px;
  opacity: 1;
}

/* Badge */
.lume-nav-badge {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}
.lume-nav-badge.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}
.lume-nav-badge:not(.dot) {
  background: #ef4444;
  color: white;
  padding: 1px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

/* Footer */
.lume-sidebar-footer {
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.lume-collapse-btn {
  width: 100%;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  font-family: inherit;
}

.lume-collapse-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

/* Collapsed states */
.lume-sidebar.collapsed .lume-nav-item {
  justify-content: center;
  padding: 12px;
}

.lume-sidebar.collapsed .lume-sidebar-header {
  padding: 20px 18px;
}

.lume-sidebar.collapsed .lume-logo {
  justify-content: center;
}

@media (max-width: 1024px) {
  .lume-sidebar {
    transform: translateX(-100%);
  }
}
</style>

<style>
/* Popover styles (unscoped — required for antd overlay) */
.lume-popup-menu {
  min-width: 160px;
}
.lume-popup-title {
  font-weight: 600;
  font-size: 13px;
  padding: 4px 0 8px;
  color: #1f2937;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 4px;
}
.lume-popup-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  color: #4b5563;
  text-decoration: none;
  font-size: 13px;
  transition: all 0.15s;
}
.lume-popup-item:hover {
  background: #f3f4f6;
  color: #1f2937;
}
.lume-popup-item.active {
  background: rgba(79, 70, 229, 0.1);
  color: #4f46e5;
}
</style>
