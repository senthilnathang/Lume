<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="lume-modal-mask" @click="handleMaskClick">
        <div
          class="lume-modal-wrapper"
          :class="{ centered }"
          :style="{ width: typeof width === 'number' ? `${width}px` : width }"
          @click.stop
        >
          <div class="lume-modal-header">
            <h3 class="lume-modal-title">{{ title }}</h3>
            <button v-if="closable" class="lume-modal-close" @click="handleClose">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="lume-modal-body">
            <slot></slot>
          </div>

          <div v-if="$slots.footer || footer !== null" class="lume-modal-footer">
            <slot name="footer">
              <template v-if="footer === undefined">
                <button class="lume-btn lume-btn-default" @click="handleClose">Cancel</button>
                <button class="lume-btn lume-btn-primary" :loading="confirmLoading" @click="handleConfirm">
                  {{ okText }}
                </button>
              </template>
              <template v-else>
                <component :is="footer" @close="handleClose" @confirm="handleConfirm" />
              </template>
            </slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue';

const props = withDefaults(defineProps<{
  visible: boolean;
  title?: string;
  width?: string | number;
  centered?: boolean;
  closable?: boolean;
  maskClosable?: boolean;
  keyboard?: boolean;
  okText?: string;
  confirmLoading?: boolean;
  footer?: any;
}>(), {
  title: '',
  width: 520,
  centered: true,
  closable: true,
  maskClosable: true,
  keyboard: true,
  okText: 'OK',
  confirmLoading: false,
});

const emit = defineEmits<{
  'update:visible': [visible: boolean];
  'cancel': [];
  'ok': [];
}>();

const handleClose = () => {
  emit('update:visible', false);
  emit('cancel');
};

const handleConfirm = () => {
  emit('ok');
};

const handleMaskClick = () => {
  if (props.maskClosable) {
    handleClose();
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.keyboard && props.visible) {
    handleClose();
  }
};

watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.body.style.overflow = '';
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.lume-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.lume-modal-wrapper {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  animation: modalIn 0.2s ease;
}

.lume-modal-wrapper.centered {
  align-items: center;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.lume-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.lume-modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.lume-modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.lume-modal-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.lume-modal-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.lume-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
}

.lume-btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.lume-btn-default {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.lume-btn-default:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.lume-btn-primary {
  background: #4f46e5;
  border: 1px solid #4f46e5;
  color: white;
}

.lume-btn-primary:hover {
  background: #4338ca;
  border-color: #4338ca;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .lume-modal-wrapper,
.modal-leave-to .lume-modal-wrapper {
  transform: scale(0.95);
}
</style>
