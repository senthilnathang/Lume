<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import {
  Copy, ClipboardPaste, CopyPlus, Trash2,
  Bookmark, ArrowUp, ArrowDown, FileBox
} from 'lucide-vue-next';

const props = defineProps<{
  editor: any;
}>();

const emit = defineEmits<{
  (e: 'copy'): void;
  (e: 'paste'): void;
  (e: 'duplicate'): void;
  (e: 'delete'): void;
  (e: 'save-preset'): void;
  (e: 'save-template'): void;
  (e: 'move-up'): void;
  (e: 'move-down'): void;
}>();

const visible = ref(false);
const x = ref(0);
const y = ref(0);
const menuRef = ref<HTMLElement | null>(null);

interface MenuItem {
  label: string;
  icon: any;
  action: string;
  divider?: boolean;
}

const menuItems: MenuItem[] = [
  { label: 'Copy Block', icon: Copy, action: 'copy' },
  { label: 'Paste Block', icon: ClipboardPaste, action: 'paste' },
  { label: 'Duplicate', icon: CopyPlus, action: 'duplicate' },
  { label: 'Delete', icon: Trash2, action: 'delete', divider: true },
  { label: 'Move Up', icon: ArrowUp, action: 'move-up' },
  { label: 'Move Down', icon: ArrowDown, action: 'move-down', divider: true },
  { label: 'Save as Preset', icon: Bookmark, action: 'save-preset' },
  { label: 'Save as Template', icon: FileBox, action: 'save-template' },
];

function show(event: MouseEvent) {
  event.preventDefault();
  // Only show if we have a block selected or cursor is inside a block
  if (!props.editor) return;

  x.value = event.clientX;
  y.value = event.clientY;
  visible.value = true;

  // Adjust position if menu goes off screen
  nextTick(() => {
    if (!menuRef.value) return;
    const rect = menuRef.value.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    if (rect.right > winW) x.value = winW - rect.width - 8;
    if (rect.bottom > winH) y.value = winH - rect.height - 8;
    if (x.value < 0) x.value = 8;
    if (y.value < 0) y.value = 8;
  });
}

function hide() {
  visible.value = false;
}

function handleAction(action: string) {
  emit(action as any);
  hide();
}

function onClickOutside(e: MouseEvent) {
  if (visible.value && menuRef.value && !menuRef.value.contains(e.target as Node)) {
    hide();
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside);
  document.addEventListener('scroll', hide, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside);
  document.removeEventListener('scroll', hide, true);
});

defineExpose({ show, hide });
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="block-context-menu"
      :style="{ left: x + 'px', top: y + 'px' }"
    >
      <template v-for="(item, idx) in menuItems" :key="item.action">
        <div v-if="item.divider && idx > 0" class="context-menu-divider" />
        <button class="context-menu-item" @click="handleAction(item.action)">
          <component :is="item.icon" :size="14" />
          <span>{{ item.label }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.block-context-menu {
  position: fixed;
  z-index: 10000;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 4px;
  min-width: 180px;
  animation: contextMenuIn 0.1s ease-out;
}

@keyframes contextMenuIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 12px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  transition: background 0.1s;
  text-align: left;
}
.context-menu-item:hover {
  background: #f3f4f6;
}

.context-menu-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 8px;
}
</style>
