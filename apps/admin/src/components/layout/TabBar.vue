<template>
  <div class="lume-tabbar" @wheel.prevent="onWheel">
    <div ref="scrollRef" class="lume-tabbar-scroll">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        class="lume-tab"
        :class="{ active: tab.key === activeKey, pinned: tab.pinned }"
        @click="go(tab.key)"
        @click.middle.prevent="close(tab.key)"
        @contextmenu.prevent="(e: MouseEvent) => openMenu(e, tab.key)"
      >
        <span v-if="tab.pinned" class="lume-tab-pin">📌</span>
        <span class="lume-tab-title">{{ tab.title }}</span>
        <span v-if="!tab.pinned" class="lume-tab-close" @click.stop="close(tab.key)">×</span>
      </div>
    </div>
    <a-dropdown :trigger="['click']">
      <a-button type="text" size="small" title="Tab actions">▾</a-button>
      <template #overlay>
        <a-menu>
          <a-menu-item key="refresh" @click="refreshCurrent">Refresh current</a-menu-item>
          <a-menu-item key="pin" @click="pinCurrent">{{ isPinned ? 'Unpin' : 'Pin' }} current</a-menu-item>
          <a-menu-divider />
          <a-menu-item key="others" @click="closeOthers">Close others</a-menu-item>
          <a-menu-item key="left" @click="closeLeft">Close to the left</a-menu-item>
          <a-menu-item key="right" @click="closeRight">Close to the right</a-menu-item>
          <a-menu-item key="all" @click="closeAll">Close all</a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
    <a-dropdown :trigger="['contextmenu']" :open="menuOpen" @openChange="(v: boolean) => { if (!v) menuOpen = false; }">
      <span style="width: 0; height: 0; overflow: hidden; position: fixed" :style="{ left: `${menuX}px`, top: `${menuY}px` }" />
      <template #overlay>
        <a-menu>
          <a-menu-item key="c-refresh" @click="refreshCurrent">Refresh</a-menu-item>
          <a-menu-item key="c-pin" @click="pinTarget">{{ targetPinned ? 'Unpin' : 'Pin' }}</a-menu-item>
          <a-menu-divider />
          <a-menu-item key="c-others" @click="closeTargetOthers">Close others</a-menu-item>
          <a-menu-item key="c-left" @click="closeTargetLeft">Close to the left</a-menu-item>
          <a-menu-item key="c-right" @click="closeTargetRight">Close to the right</a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTabBarStore } from '@/store/tabbar';

const route = useRoute();
const router = useRouter();
const store = useTabBarStore();

const scrollRef = ref<HTMLElement | null>(null);
const menuOpen = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const menuTarget = ref('');

const tabs = computed(() => store.tabs);
const activeKey = computed(() => route.fullPath);
const targetPinned = computed(() => tabs.value.find((t) => t.key === menuTarget.value)?.pinned ?? false);
const isPinned = computed(() => tabs.value.find((t) => t.key === activeKey.value)?.pinned ?? false);

watch(
  () => route.fullPath,
  (fullPath) => {
    store.openTab(fullPath, String(route.meta?.title || route.name || fullPath));
    scrollActive();
  },
  { immediate: true },
);

function scrollActive() {
  requestAnimationFrame(() => {
    const container = scrollRef.value;
    const active = container?.querySelector('.lume-tab.active') as HTMLElement | null;
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
}

function go(key: string) {
  if (key !== route.fullPath) router.push(key);
}

function close(key: string) {
  const fallback = store.closeTab(key);
  if (key === route.fullPath && fallback) router.push(fallback);
}

function onWheel(event: WheelEvent) {
  scrollRef.value?.scrollBy({ left: event.deltaY });
}

function openMenu(event: MouseEvent, key: string) {
  menuTarget.value = key;
  menuX.value = event.clientX;
  menuY.value = event.clientY;
  menuOpen.value = true;
}

function refreshCurrent() {
  store.refreshTab();
  router.replace({ path: route.path, query: { ...route.query, _t: Date.now() } });
}

function pinCurrent() {
  store.togglePin(activeKey.value);
}

function pinTarget() {
  store.togglePin(menuTarget.value);
}

function closeOthers() {
  store.closeOtherTabs(activeKey.value);
}

function closeLeft() {
  store.closeLeftTabs(activeKey.value);
}

function closeRight() {
  store.closeRightTabs(activeKey.value);
}

function closeAll() {
  store.closeAllTabs();
  const first = store.tabs[0];
  if (first && first.key !== route.fullPath) router.push(first.key);
}

function closeTargetOthers() {
  store.closeOtherTabs(menuTarget.value);
  if (menuTarget.value !== route.fullPath) router.push(menuTarget.value);
}

function closeTargetLeft() {
  store.closeLeftTabs(menuTarget.value);
}

function closeTargetRight() {
  store.closeRightTabs(menuTarget.value);
}
</script>
<style scoped>
.lume-tabbar {
  display: flex;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #eee;
  padding: 0 8px;
  gap: 4px;
}
.lume-tabbar-scroll {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  flex: 1;
  padding: 6px 0;
  scrollbar-width: none;
}
.lume-tabbar-scroll::-webkit-scrollbar {
  display: none;
}
.lume-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  font-size: 13px;
  color: #555;
  background: #f5f5f5;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}
.lume-tab:hover {
  background: #e8e8e8;
}
.lume-tab.active {
  background: #e6f4ff;
  color: #1677ff;
  font-weight: 600;
}
.lume-tab-close {
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
  border-radius: 4px;
}
.lume-tab-close:hover {
  background: rgba(0, 0, 0, 0.1);
}
.lume-tab-pin {
  font-size: 11px;
}
</style>
