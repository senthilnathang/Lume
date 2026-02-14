# Plan: Replicate FastVue Menu Structure for Lume Frontend

## Goal
Replace the flat, single-group sidebar in Lume with a hierarchical, collapsible, grouped menu system matching FastVue's enterprise-grade navigation — while keeping Lume's simpler component stack (no Vben mono-repo).

---

## Current State (Lume)

### What exists:
- **Sidebar.vue** (410 lines) — flat list, single "Gawdesy" group, no nesting, 35+ hand-coded SVG icons
- **BasicLayout.vue** — simple 3-panel layout (sidebar, header, content)
- **Header.vue** — search bar, user dropdown, notifications
- **Breadcrumb.vue** — auto-generated from route
- **Permission store** — fetches `/api/menus` and `/api/permissions`
- **Router** — dynamic routes from menu data, but no children/nesting support

### What's missing vs FastVue:
1. No submenu expansion (children never rendered)
2. No accordion mode (only one group open at a time)
3. No menu grouping by category (everything in one flat "Gawdesy" list)
4. Icons are inline SVG render functions (not scalable)
5. No tooltip on collapsed hover
6. No scroll-to-active on load
7. Router doesn't handle nested child paths
8. No badge/dot system on menu items

---

## Target State (FastVue-style)

### Menu Structure from Backend (15 groups, nested):
```
Dashboard
Activities          → All Activities, Upcoming, Calendar
Team                → All Team, Leadership, Departments
Donations           → All Donations, Donors, Campaigns, Reports
Messages            → Inbox, Sent
Documents           → All Documents, Images, Videos
Media               → Library, Upload, Featured
Access Control      → Roles, Permissions, Access Rules, Audit
Security            → Access Control, 2FA, Sessions, API Keys
Features & Data     → Feature Flags, Import, Export, Backups
Automation          → Workflows, Flows, Business Rules, Approvals, Scheduled
Settings            → Modules, Menus, Users, Groups, Roles, Permissions, Record Rules, Sequences, System
Audit Logs          → All Logs, Cleanup
```

### Visual Behavior:
- Grouped sections with uppercase group titles
- Expandable submenus with chevron arrow (animated rotation)
- Accordion mode: expanding one group auto-closes others
- Active item: indigo left border + tinted background
- Collapsed sidebar: icons only + tooltip on hover showing label
- Smooth transitions (0.3s ease)
- Custom scrollbar on nav overflow
- Badge support (dot/count) for items like Messages

---

## Implementation Plan

### Phase 1: Replace Icon System with Lucide Vue

**Why:** The current Sidebar has 35+ hand-coded SVG render functions (250+ lines of boilerplate). Lucide Vue Next is already a dependency in package.json.

**Files:** `src/components/layout/Sidebar.vue`

**Steps:**
1. Remove the entire `getIcon()` function and its 35+ icon definitions
2. Import icons dynamically from `lucide-vue-next`:
   ```ts
   import { icons } from 'lucide-vue-next'

   function resolveIcon(name?: string) {
     if (!name) return icons.Circle
     // Handle "lucide:xxx" format from backend
     const key = name.replace('lucide:', '')
     // Convert kebab-case to PascalCase: "shield-check" → "ShieldCheck"
     const pascal = key.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase())
     return icons[pascal] || icons.Circle
   }
   ```
3. In template: `<component :is="resolveIcon(item.icon)" :size="20" />`

**Result:** ~250 lines of SVG boilerplate removed, all 40+ lucide icons work automatically.

---

### Phase 2: Add Submenu Expansion (Children Support)

**Why:** Backend sends nested `children[]` arrays but Sidebar renders everything flat.

**Files:** `src/components/layout/Sidebar.vue`

**Steps:**
1. Create a recursive `SidebarMenuItem` component (or inline template):
   ```vue
   <template v-for="item in items" :key="item.path">
     <!-- Leaf item (no children) -->
     <li v-if="!item.children?.length && !item.hideInMenu">
       <router-link :to="item.path" class="lume-nav-item" :class="{ active: isActive(item.path) }">
         <component :is="resolveIcon(item.icon)" :size="20" />
         <span v-if="!collapsed">{{ item.name }}</span>
       </router-link>
     </li>
     <!-- Parent item (has children) -->
     <li v-else-if="!item.hideInMenu" class="lume-nav-submenu">
       <button class="lume-nav-item" :class="{ active: isChildActive(item) }" @click="toggleSubmenu(item.path)">
         <component :is="resolveIcon(item.icon)" :size="20" />
         <span v-if="!collapsed">{{ item.name }}</span>
         <ChevronDown v-if="!collapsed" :size="16" class="lume-nav-arrow" :class="{ rotated: openMenus.has(item.path) }" />
       </button>
       <transition name="submenu">
         <ul v-show="openMenus.has(item.path) && !collapsed" class="lume-nav-children">
           <li v-for="child in item.children" :key="child.path">
             <router-link :to="child.path" class="lume-nav-item child-item" :class="{ active: isActive(child.path) }">
               <component :is="resolveIcon(child.icon)" :size="16" />
               <span>{{ child.name }}</span>
             </router-link>
           </li>
         </ul>
       </transition>
     </li>
   </template>
   ```

2. Add state for open submenus:
   ```ts
   const openMenus = ref<Set<string>>(new Set())

   function toggleSubmenu(path: string) {
     if (openMenus.value.has(path)) {
       openMenus.value.delete(path)
     } else {
       // Accordion: close others
       openMenus.value.clear()
       openMenus.value.add(path)
     }
   }
   ```

3. Auto-expand the submenu containing the active route on mount:
   ```ts
   watch(() => route.path, (path) => {
     for (const menu of props.menus) {
       if (menu.children?.some(c => path.startsWith(c.path))) {
         openMenus.value.add(menu.path)
       }
     }
   }, { immediate: true })
   ```

4. Add CSS for submenu transition:
   ```css
   .lume-nav-arrow {
     margin-left: auto;
     transition: transform 0.2s ease;
   }
   .lume-nav-arrow.rotated { transform: rotate(180deg); }

   .lume-nav-children {
     list-style: none;
     padding: 0;
     margin: 0;
   }
   .lume-nav-item.child-item {
     padding-left: 48px;  /* indent children */
     font-size: 13px;
   }

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
   ```

**Result:** Nested menus with accordion expand/collapse, animated chevron arrow.

---

### Phase 3: Menu Grouping by Category

**Why:** FastVue groups menus under section headers (Navigation, Settings, System, etc.). Currently Lume puts everything under one "Gawdesy" group.

**Files:** `src/components/layout/Sidebar.vue`

**Steps:**
1. Define group categories based on module paths:
   ```ts
   const menuCategories = [
     { id: 'main', title: 'Navigation', paths: ['/dashboard', '/activities', '/team', '/donations', '/messages'] },
     { id: 'content', title: 'Content', paths: ['/documents', '/media'] },
     { id: 'admin', title: 'Administration', paths: ['/settings', '/audit'] },
     { id: 'system', title: 'System', paths: ['/lume'] },
   ]
   ```

2. Replace the single-group `menuGroups` computed with category-based grouping:
   ```ts
   const menuGroups = computed(() => {
     const categorized = menuCategories.map(cat => ({
       ...cat,
       items: props.menus.filter(menu =>
         !menu.hideInMenu && cat.paths.some(p => menu.path.startsWith(p))
       )
     })).filter(cat => cat.items.length > 0)

     // Catch uncategorized items
     const categorizedPaths = new Set(categorized.flatMap(c => c.items.map(i => i.path)))
     const uncategorized = props.menus.filter(m => !m.hideInMenu && !categorizedPaths.has(m.path))
     if (uncategorized.length) {
       categorized.push({ id: 'other', title: 'Other', items: uncategorized, paths: [] })
     }
     return categorized
   })
   ```

3. Keep existing template structure for groups (already iterates `menuGroups`).

**Result:** Menus organized under section headers like FastVue.

---

### Phase 4: Collapsed Sidebar Tooltips

**Why:** When sidebar is collapsed, users can't see menu labels. FastVue shows tooltips on hover.

**Files:** `src/components/layout/Sidebar.vue`

**Steps:**
1. Add tooltip wrapper around collapsed nav items:
   ```vue
   <a-tooltip v-if="collapsed" :title="item.name" placement="right">
     <router-link :to="item.path" class="lume-nav-item">
       <component :is="resolveIcon(item.icon)" :size="20" />
     </router-link>
   </a-tooltip>
   ```
   (Uses Ant Design Vue's `a-tooltip` since it's already registered globally.)

2. For parent items with children in collapsed mode, show a hover popover with children links:
   ```vue
   <a-popover v-if="collapsed && item.children?.length" placement="right" trigger="hover">
     <template #content>
       <div class="lume-popup-menu">
         <div class="lume-popup-title">{{ item.name }}</div>
         <router-link v-for="child in item.children" :key="child.path" :to="child.path" class="lume-popup-item">
           {{ child.name }}
         </router-link>
       </div>
     </template>
     <button class="lume-nav-item">
       <component :is="resolveIcon(item.icon)" :size="20" />
     </button>
   </a-popover>
   ```

**Result:** Collapsed sidebar shows labels via tooltip, child menus via hover popover.

---

### Phase 5: Router Support for Nested Child Routes

**Why:** The access guard in router creates flat routes from menus, but menu children (e.g., `/donations/donors`) aren't registered as routes, causing 404s.

**Files:** `src/router/index.ts`

**Steps:**
1. In the access guard (`setupAccessGuard`), iterate children too:
   ```ts
   for (const menu of menus) {
     if (!menu.path || menu.hideInMenu) continue
     const routeName = menu.name || menu.path.split('/').pop()
     if (staticRoutes.includes(routeName)) continue

     // Register parent route
     const moduleName = menu.module || routeName
     if (!router.hasRoute(routeName)) {
       router.addRoute('App', {
         path: menu.path.startsWith('/') ? menu.path.slice(1) : menu.path,
         name: routeName,
         component: () => loadModuleView(moduleName, routeName),
         props: { moduleName },
         meta: { title: menu.name, icon: menu.icon, permission: menu.permission, requiresAuth: true, module: moduleName },
       })
     }

     // Register child routes
     if (menu.children?.length) {
       for (const child of menu.children) {
         if (!child.path || child.hideInMenu) continue
         const childRouteName = child.name || child.path.split('/').pop()
         const childModule = child.module || moduleName
         if (!router.hasRoute(childRouteName)) {
           router.addRoute('App', {
             path: child.path.startsWith('/') ? child.path.slice(1) : child.path,
             name: childRouteName,
             component: () => loadModuleView(childModule, childRouteName),
             props: { moduleName: childModule },
             meta: { title: child.name, icon: child.icon, permission: child.permission, requiresAuth: true, module: childModule },
           })
         }
       }
     }
   }
   ```

2. Also update `addDynamicRoutes()` to handle children the same way.

**Result:** All nested child routes are registered and navigable.

---

### Phase 6: Active State & Scroll to Active

**Why:** When page loads or navigating, the sidebar should auto-expand the parent submenu and scroll to the active item.

**Files:** `src/components/layout/Sidebar.vue`

**Steps:**
1. Add `isChildActive` helper:
   ```ts
   function isChildActive(item: MenuItem): boolean {
     return item.children?.some(c => isActive(c.path)) || isActive(item.path)
   }
   ```

2. On mount and route change, auto-expand parent and scroll:
   ```ts
   onMounted(() => {
     nextTick(() => {
       const activeEl = document.querySelector('.lume-nav-item.active')
       activeEl?.scrollIntoView({ block: 'center', behavior: 'smooth' })
     })
   })
   ```

3. Style active parent differently from active child:
   ```css
   .lume-nav-submenu > .lume-nav-item.active {
     color: white;
     background: rgba(79, 70, 229, 0.1);
   }
   ```

**Result:** Active menu item is always visible, parent auto-expanded.

---

### Phase 7: Badge System

**Why:** FastVue supports badges (notification dots/counts) on menu items. The backend already provides badge data in manifests.

**Files:** `src/components/layout/Sidebar.vue`

**Steps:**
1. Add badge rendering:
   ```vue
   <span v-if="item.badge" class="lume-nav-badge" :class="item.badgeType || 'dot'">
     {{ item.badgeType === 'dot' ? '' : item.badge }}
   </span>
   ```

2. CSS:
   ```css
   .lume-nav-badge {
     margin-left: auto;
     font-size: 11px;
     font-weight: 600;
   }
   .lume-nav-badge.dot {
     width: 8px; height: 8px;
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
   ```

**Result:** Menu items can show notification counts or dots.

---

### Phase 8: Custom Scrollbar & Visual Polish

**Files:** `src/components/layout/Sidebar.vue`

**Steps:**
1. Add custom scrollbar CSS:
   ```css
   .lume-sidebar-nav::-webkit-scrollbar { width: 4px; }
   .lume-sidebar-nav::-webkit-scrollbar-track { background: transparent; }
   .lume-sidebar-nav::-webkit-scrollbar-thumb {
     background: rgba(255, 255, 255, 0.15);
     border-radius: 4px;
   }
   .lume-sidebar-nav::-webkit-scrollbar-thumb:hover {
     background: rgba(255, 255, 255, 0.25);
   }
   ```

2. Add expand-on-hover (sidebar expands when hovering in collapsed mode):
   ```vue
   <aside class="lume-sidebar" :class="{ collapsed: isCollapsed, 'expand-on-hover': isCollapsed }"
     @mouseenter="hovering = true" @mouseleave="hovering = false">
   ```
   ```ts
   const hovering = ref(false)
   const isCollapsed = computed(() => props.collapsed && !hovering.value)
   ```

3. Add divider lines between menu groups.

**Result:** Polished, enterprise-quality sidebar.

---

## File Change Summary

| File | Action | Lines Changed (est.) |
|------|--------|---------------------|
| `src/components/layout/Sidebar.vue` | **Major rewrite** | ~300 lines (from 410) |
| `src/router/index.ts` | **Edit** — add child route registration | ~30 lines added |
| `src/main.ts` | **Done** — Antd already registered | 0 |
| `CLAUDE.md` | **Done** — instructions added | 0 |

## Dependencies
- `lucide-vue-next` — already in package.json
- `ant-design-vue` — already registered (tooltips/popovers)
- No new packages needed

## Execution Order
1. Phase 1 (icons) — standalone, no deps
2. Phase 2 (submenus) — standalone, no deps
3. Phase 5 (router children) — needed for child links to work
4. Phase 3 (grouping) — depends on Phase 2
5. Phase 4 (tooltips) — depends on Phase 2
6. Phase 6 (active state) — depends on Phase 2
7. Phase 7 (badges) — standalone
8. Phase 8 (polish) — last

## Estimated Scope
- **1 file rewritten** (Sidebar.vue)
- **1 file edited** (router/index.ts)
- **0 new files** needed
- All changes are frontend-only — backend menu API already provides the correct nested structure
