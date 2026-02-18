<script setup lang="ts">
import { ref, computed } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  triggerText?: string;
  triggerVariant?: string;
  direction?: string;
  width?: string;
  panelTitle?: string;
  panelContent?: string;
  overlayColor?: string;
  showCloseButton?: boolean;
}>(), {
  triggerText: 'Open Panel',
  triggerVariant: 'primary',
  direction: 'right',
  width: '400',
  panelTitle: 'Panel',
  panelContent: 'Your content here',
  overlayColor: 'rgba(0,0,0,0.5)',
  showCloseButton: true,
});

const isOpen = ref(false);

const panelWidthPx = computed(() => {
  const w = parseInt(props.width, 10);
  return isNaN(w) ? '400px' : `${w}px`;
});

const panelStyles = computed(() => ({
  width: panelWidthPx.value,
  maxWidth: '90vw',
  [props.direction === 'left' ? 'left' : 'right']: '0',
  transform: isOpen.value ? 'translateX(0)' : `translateX(${props.direction === 'left' ? '-100%' : '100%'})`,
}));

const triggerClasses = computed(() => [
  'lume-offcanvas-trigger',
  `lume-offcanvas-trigger--${props.triggerVariant}`,
]);

function open() { isOpen.value = true; }
function close() { isOpen.value = false; }
</script>

<template>
  <div class="lume-offcanvas">
    <button :class="triggerClasses" @click="open">
      {{ triggerText }}
    </button>

    <Teleport to="body">
      <!-- Overlay -->
      <Transition name="lume-offcanvas-overlay">
        <div
          v-if="isOpen"
          class="lume-offcanvas-overlay"
          :style="{ backgroundColor: overlayColor }"
          @click="close"
        />
      </Transition>

      <!-- Panel -->
      <div
        class="lume-offcanvas-panel"
        :class="{ 'lume-offcanvas-panel--open': isOpen }"
        :style="panelStyles"
      >
        <div class="lume-offcanvas-panel-header">
          <h3 class="lume-offcanvas-panel-title">{{ panelTitle }}</h3>
          <button
            v-if="showCloseButton"
            class="lume-offcanvas-close"
            aria-label="Close panel"
            @click="close"
          >
            &times;
          </button>
        </div>
        <div
          class="lume-offcanvas-panel-body"
          v-html="panelContent"
        />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.lume-offcanvas-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  font-size: 0.9375rem;
  font-weight: 500;
  border-radius: var(--lume-radius, 6px);
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.lume-offcanvas-trigger--primary {
  background: var(--lume-primary, #1677ff);
  color: #fff;
  border-color: var(--lume-primary, #1677ff);
}
.lume-offcanvas-trigger--primary:hover {
  background: var(--lume-primary-hover, #0958d9);
  border-color: var(--lume-primary-hover, #0958d9);
}
.lume-offcanvas-trigger--outline {
  background: transparent;
  color: var(--lume-primary, #1677ff);
  border-color: var(--lume-primary, #1677ff);
}
.lume-offcanvas-trigger--outline:hover {
  background: var(--lume-primary, #1677ff);
  color: #fff;
}
.lume-offcanvas-trigger--ghost {
  background: transparent;
  color: var(--lume-primary, #1677ff);
  border-color: transparent;
}
.lume-offcanvas-trigger--ghost:hover {
  background: var(--lume-bg-hover, #f3f4f6);
}

.lume-offcanvas-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
}
.lume-offcanvas-overlay-enter-active,
.lume-offcanvas-overlay-leave-active {
  transition: opacity 0.3s ease;
}
.lume-offcanvas-overlay-enter-from,
.lume-offcanvas-overlay-leave-to {
  opacity: 0;
}

.lume-offcanvas-panel {
  position: fixed;
  top: 0;
  bottom: 0;
  z-index: 9999;
  background: var(--lume-bg, #fff);
  box-shadow: var(--lume-shadow-lg, 0 10px 40px rgba(0, 0, 0, 0.15));
  display: flex;
  flex-direction: column;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.lume-offcanvas-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--lume-border, #e5e7eb);
  flex-shrink: 0;
}
.lume-offcanvas-panel-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--lume-text, #1f2937);
}
.lume-offcanvas-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--lume-text-muted, #6b7280);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.15s;
}
.lume-offcanvas-close:hover {
  background: var(--lume-bg-hover, #f3f4f6);
  color: var(--lume-text, #1f2937);
}

.lume-offcanvas-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--lume-text-secondary, #4b5563);
}
</style>
