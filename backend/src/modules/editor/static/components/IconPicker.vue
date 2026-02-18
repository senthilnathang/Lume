<script setup lang="ts">
import { ref, computed, watch, defineComponent, h } from 'vue';
import { Search, Check, Type } from 'lucide-vue-next';
import * as LucideIcons from 'lucide-vue-next';
import { get } from '@/api/request';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const modalOpen = ref(false);
const activeTab = ref('lucide');
const searchQuery = ref('');
const customIcons = ref<any[]>([]);
const loadingCustom = ref(false);

// ~50 common Lucide icon names
const COMMON_LUCIDE_ICONS = [
  'Search', 'Home', 'User', 'Star', 'Heart', 'Mail', 'Phone', 'Map', 'MapPin',
  'Settings', 'Bell', 'Calendar', 'Camera', 'Clock', 'Cloud', 'Code', 'Copy',
  'Download', 'Edit', 'File', 'Filter', 'Flag', 'Folder', 'Gift', 'Globe',
  'Image', 'Info', 'Link', 'List', 'Lock', 'LogIn', 'LogOut', 'Menu',
  'Message', 'MessageCircle', 'Moon', 'Music', 'Package', 'Paperclip', 'PenTool',
  'Play', 'Plus', 'Printer', 'RefreshCw', 'Save', 'Send', 'Share', 'Shield',
  'ShoppingCart', 'Smile', 'Sun', 'Tag', 'Trash2', 'TrendingUp', 'Upload',
  'Users', 'Video', 'Wifi', 'X', 'ZoomIn', 'Award', 'Briefcase', 'ChevronRight',
  'ArrowRight', 'CheckCircle', 'AlertCircle', 'Zap', 'Eye', 'Bookmark', 'ThumbsUp',
  'Layers', 'Layout', 'Monitor', 'Smartphone', 'Tablet', 'Cpu', 'Database', 'Server',
  'Terminal', 'Tool', 'Wrench', 'PieChart', 'BarChart2', 'TrendingDown', 'Activity',
  'Headphones', 'Mic', 'Radio', 'Rss', 'Navigation', 'Compass', 'Anchor',
];

const filteredLucideIcons = computed(() => {
  const q = searchQuery.value.toLowerCase();
  if (!q) return COMMON_LUCIDE_ICONS;
  return COMMON_LUCIDE_ICONS.filter(name => name.toLowerCase().includes(q));
});

// Resolve a Lucide icon component by name
function getLucideIcon(name: string): any {
  return (LucideIcons as any)[name] || null;
}

// Render a Lucide icon component dynamically
function renderLucideIcon(name: string) {
  const Icon = getLucideIcon(name);
  if (!Icon) return null;
  return defineComponent({
    setup() {
      return () => h(Icon, { size: 20 });
    },
  });
}

watch(modalOpen, async (isOpen) => {
  if (isOpen) {
    searchQuery.value = '';
    if (activeTab.value === 'custom') {
      await loadCustomIcons();
    }
  }
});

watch(activeTab, async (tab) => {
  if (tab === 'custom' && customIcons.value.length === 0) {
    await loadCustomIcons();
  }
  searchQuery.value = '';
});

async function loadCustomIcons() {
  loadingCustom.value = true;
  try {
    const data = await get<any[]>('/website/icons');
    customIcons.value = Array.isArray(data) ? data : (data as any)?.data || [];
  } catch {
    customIcons.value = [];
  } finally {
    loadingCustom.value = false;
  }
}

const filteredCustomIcons = computed(() => {
  const q = searchQuery.value.toLowerCase();
  if (!q) return customIcons.value;
  return customIcons.value.filter(
    (icon) => icon.name?.toLowerCase().includes(q) || icon.tags?.toLowerCase().includes(q)
  );
});

function selectLucideIcon(name: string) {
  emit('update:modelValue', `lucide:${name}`);
  modalOpen.value = false;
}

function selectCustomIcon(icon: any) {
  emit('update:modelValue', `custom:${icon.id}`);
  modalOpen.value = false;
}

function openModal() {
  modalOpen.value = true;
}

// Derive display from current value
const displayIcon = computed(() => {
  if (!props.modelValue) return null;
  if (props.modelValue.startsWith('lucide:')) {
    return { type: 'lucide', name: props.modelValue.replace('lucide:', '') };
  }
  if (props.modelValue.startsWith('custom:')) {
    const id = parseInt(props.modelValue.replace('custom:', ''));
    return { type: 'custom', id };
  }
  // Plain lucide name (legacy support)
  return { type: 'lucide', name: props.modelValue };
});

const displayCustomIcon = computed(() => {
  if (!displayIcon.value || displayIcon.value.type !== 'custom') return null;
  return customIcons.value.find(ic => ic.id === displayIcon.value?.id) || null;
});

const isSelectedLucide = (name: string) =>
  props.modelValue === `lucide:${name}` || props.modelValue === name;

const isSelectedCustom = (icon: any) =>
  props.modelValue === `custom:${icon.id}`;
</script>

<template>
  <div class="icon-picker">
    <!-- Trigger button -->
    <button class="icon-picker-trigger" @click="openModal">
      <!-- Show current icon -->
      <span v-if="displayIcon?.type === 'lucide'" class="ip-current-icon">
        <component :is="getLucideIcon(displayIcon.name)" :size="16" />
      </span>
      <span
        v-else-if="displayIcon?.type === 'custom' && displayCustomIcon"
        class="ip-current-icon ip-svg"
        v-html="displayCustomIcon.svgContent"
      />
      <Type v-else :size="16" class="ip-placeholder-icon" />
      <span class="ip-label">{{ modelValue || 'Select Icon' }}</span>
      <Check v-if="modelValue" :size="12" class="ip-check" />
    </button>

    <!-- Icon Picker Modal -->
    <a-modal
      v-model:open="modalOpen"
      title="Choose Icon"
      :footer="null"
      width="600px"
      :destroy-on-close="true"
    >
      <!-- Search bar -->
      <div class="ip-search-bar">
        <a-input
          v-model:value="searchQuery"
          placeholder="Search icons..."
          allow-clear
          size="small"
        >
          <template #prefix>
            <Search :size="14" style="color: #9ca3af" />
          </template>
        </a-input>
      </div>

      <a-tabs v-model:activeKey="activeTab" size="small">

        <!-- Lucide Icons Tab -->
        <a-tab-pane key="lucide" tab="Lucide Icons">
          <div v-if="filteredLucideIcons.length === 0" class="ip-empty">
            <a-empty description="No icons match your search" />
          </div>
          <div v-else class="ip-grid">
            <a-tooltip
              v-for="name in filteredLucideIcons"
              :key="name"
              :title="name"
              placement="top"
            >
              <button
                :class="['ip-grid-item', isSelectedLucide(name) && 'ip-grid-item--active']"
                @click="selectLucideIcon(name)"
              >
                <component :is="getLucideIcon(name)" :size="20" />
                <span class="ip-grid-label">{{ name }}</span>
              </button>
            </a-tooltip>
          </div>
        </a-tab-pane>

        <!-- Custom Icons Tab -->
        <a-tab-pane key="custom" tab="Custom Icons">
          <div v-if="loadingCustom" class="ip-loading">
            <a-spin />
          </div>
          <div v-else-if="filteredCustomIcons.length === 0" class="ip-empty">
            <a-empty :description="customIcons.length === 0 ? 'No custom icons uploaded yet' : 'No icons match your search'" />
          </div>
          <div v-else class="ip-custom-list">
            <div
              v-for="icon in filteredCustomIcons"
              :key="icon.id"
              :class="['ip-custom-item', isSelectedCustom(icon) && 'ip-custom-item--active']"
              @click="selectCustomIcon(icon)"
            >
              <div
                class="ip-custom-svg"
                v-html="icon.svgContent"
              />
              <span class="ip-custom-name">{{ icon.name }}</span>
              <Check v-if="isSelectedCustom(icon)" :size="14" class="ip-custom-check" />
            </div>
          </div>
        </a-tab-pane>

      </a-tabs>
    </a-modal>
  </div>
</template>

<style scoped>
.icon-picker {
  width: 100%;
}

.icon-picker-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  text-align: left;
  transition: all 0.15s;
  min-height: 32px;
}

.icon-picker-trigger:hover {
  border-color: #4096ff;
  color: #4096ff;
}

.ip-current-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: #374151;
}

.ip-svg :deep(svg) {
  width: 16px;
  height: 16px;
}

.ip-placeholder-icon {
  color: #9ca3af;
  flex-shrink: 0;
}

.ip-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.ip-check {
  color: #22c55e;
  flex-shrink: 0;
}

.ip-search-bar {
  margin-bottom: 12px;
}

.ip-loading {
  display: flex;
  justify-content: center;
  padding: 32px;
}

.ip-empty {
  padding: 24px 0;
}

/* Lucide grid */
.ip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 4px;
  max-height: 380px;
  overflow-y: auto;
  padding: 4px;
}

.ip-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 4px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  color: #374151;
  transition: all 0.15s;
}

.ip-grid-item:hover {
  border-color: #4096ff;
  background: #f0f5ff;
  color: #4096ff;
}

.ip-grid-item--active {
  border-color: #4096ff;
  background: #e6f4ff;
  color: #4096ff;
}

.ip-grid-label {
  font-size: 9px;
  color: inherit;
  text-align: center;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

/* Custom icons list */
.ip-custom-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 380px;
  overflow-y: auto;
}

.ip-custom-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.ip-custom-item:hover {
  border-color: #4096ff;
  background: #f0f5ff;
}

.ip-custom-item--active {
  border-color: #4096ff;
  background: #e6f4ff;
}

.ip-custom-svg {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ip-custom-svg :deep(svg) {
  width: 28px;
  height: 28px;
}

.ip-custom-name {
  flex: 1;
  font-size: 13px;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ip-custom-check {
  color: #4096ff;
  flex-shrink: 0;
}
</style>
