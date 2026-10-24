<script setup lang="ts">
import { ref, computed } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  triggerText?: string;
  triggerVariant?: string;
  modalTitle?: string;
  modalContent?: string;
  modalWidth?: string;
}>(), {
  triggerText: 'Open Modal',
  triggerVariant: 'primary',
  modalTitle: 'Modal Title',
  modalContent: 'Your modal content here',
  modalWidth: 'md',
});

const isOpen = ref(false);

const widthMap: Record<string, string> = {
  sm: '400px',
  md: '560px',
  lg: '720px',
  xl: '900px',
};

const modalWidthPx = computed(() => widthMap[props.modalWidth] || widthMap.md);
</script>

<template>
  <div>
    <button
      class="lume-modal-popup-trigger"
      @click="isOpen = true"
    >
      {{ triggerText }}
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        style="position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; background-color: rgba(0, 0, 0, 0.5);"
        @click.self="isOpen = false"
      >
        <div
          :style="{ width: modalWidthPx, maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto', backgroundColor: 'var(--lume-bg)', borderRadius: 'var(--lume-radius-lg)', boxShadow: 'var(--lume-shadow-lg)', padding: '24px' }"
        >
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 1.25rem; font-weight: 600; color: var(--lume-text);">
              {{ modalTitle }}
            </h3>
            <button
              style="background: none; border: none; cursor: pointer; font-size: 1.5rem; line-height: 1; color: var(--lume-text-muted); padding: 0;"
              @click="isOpen = false"
            >
              &times;
            </button>
          </div>
          <div
            style="font-size: 0.9375rem; line-height: 1.6; color: var(--lume-text-secondary);"
            v-html="modalContent"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>
