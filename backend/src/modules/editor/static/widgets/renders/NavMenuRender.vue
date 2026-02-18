<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import '../widget-styles.css';

interface MenuItem {
  id: number;
  label: string;
  url: string;
  children?: MenuItem[];
}

const props = withDefaults(defineProps<{
  menuLocation?: string;
  layout?: string;
  hamburgerBreakpoint?: number;
  mobileLayout?: string;
  fontSize?: number;
  color?: string;
  hoverColor?: string;
}>(), {
  menuLocation: 'main',
  layout: 'horizontal',
  hamburgerBreakpoint: 768,
  mobileLayout: 'dropdown',
  fontSize: 14,
  color: '#374151',
  hoverColor: '#1677ff',
});

const items = ref<MenuItem[]>([]);
const mobileOpen = ref(false);

onMounted(async () => {
  try {
    const res = await fetch(`/api/website/public/menus/${props.menuLocation}`);
    if (res.ok) {
      const data = await res.json();
      items.value = data.data || data || [];
    }
  } catch {
    items.value = [];
  }
});

const navStyle = computed(() => ({
  fontSize: props.fontSize + 'px',
  '--nav-color': props.color,
  '--nav-hover': props.hoverColor,
}));
</script>

<template>
  <nav class="lume-nav-menu" :class="`lume-nav--${layout}`" :style="navStyle" role="navigation">
    <!-- Hamburger button (visible at breakpoint) -->
    <button class="lume-nav-hamburger" @click="mobileOpen = !mobileOpen" aria-label="Toggle menu">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>

    <ul class="lume-nav-list" :class="{ 'is-open': mobileOpen }">
      <li v-for="item in items" :key="item.id" class="lume-nav-item" :class="{ 'has-children': item.children?.length }">
        <a :href="item.url" class="lume-nav-link">{{ item.label }}</a>
        <ul v-if="item.children?.length" class="lume-nav-sub">
          <li v-for="child in item.children" :key="child.id" class="lume-nav-item">
            <a :href="child.url" class="lume-nav-link">{{ child.label }}</a>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.lume-nav-menu { position: relative; }
.lume-nav-hamburger {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--nav-color, #374151);
  padding: 8px;
}

.lume-nav-list {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 4px;
}
.lume-nav--vertical .lume-nav-list { flex-direction: column; }

.lume-nav-item { position: relative; }
.lume-nav-link {
  display: block;
  padding: 8px 16px;
  color: var(--nav-color, #374151);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s;
  white-space: nowrap;
}
.lume-nav-link:hover { color: var(--nav-hover, #1677ff); }

/* Dropdown submenu */
.lume-nav-sub {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  padding: 6px 0;
  list-style: none;
  min-width: 180px;
  z-index: 100;
}
.lume-nav-item:hover > .lume-nav-sub { display: block; }
.lume-nav-sub .lume-nav-link { padding: 8px 20px; font-size: 14px; }

@media (max-width: 768px) {
  .lume-nav-hamburger { display: flex; }
  .lume-nav-list {
    display: none;
    flex-direction: column;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    padding: 8px 0;
    z-index: 100;
  }
  .lume-nav-list.is-open { display: flex; }
  .lume-nav-sub {
    position: static;
    box-shadow: none;
    border: none;
    border-radius: 0;
    padding-left: 16px;
  }
  .lume-nav-item:hover > .lume-nav-sub { display: block; }
}
</style>
