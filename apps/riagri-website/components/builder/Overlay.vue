<template>
  <Teleport to="body">
    <Transition name="slide-down">
      <div v-if="active" class="builder-overlay">
        <!-- Top Toolbar -->
        <div class="builder-toolbar">
          <div class="toolbar-left">
            <div class="toolbar-brand">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
              <span>Live Editor</span>
            </div>
            <div class="toolbar-divider" />
            <button
              class="toolbar-btn"
              :class="{ disabled: !canUndo }"
              :disabled="!canUndo"
              title="Undo (Ctrl+Z)"
              @click="undo"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </button>
            <button
              class="toolbar-btn"
              :class="{ disabled: !canRedo }"
              :disabled="!canRedo"
              title="Redo (Ctrl+Shift+Z)"
              @click="redo"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
              </svg>
            </button>
          </div>

          <div class="toolbar-center">
            <span v-if="dirty" class="unsaved-indicator">Unsaved changes</span>
            <span v-else class="saved-indicator">Up to date</span>
          </div>

          <div class="toolbar-right">
            <button
              class="toolbar-btn-text"
              :disabled="!dirty"
              @click="discard"
            >
              Discard
            </button>
            <button
              class="toolbar-btn-primary"
              :disabled="!dirty || saving"
              @click="save"
            >
              <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{{ saving ? 'Saving...' : 'Save' }}</span>
            </button>
            <div class="toolbar-divider" />
            <button
              class="toolbar-btn-close"
              title="Exit edit mode"
              @click="exitEditMode"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Notification Toast -->
        <Transition name="toast">
          <div
            v-if="notification"
            class="builder-toast"
            :class="`toast-${notification.type}`"
          >
            <svg v-if="notification.type === 'success'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg v-else-if="notification.type === 'error'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <span>{{ notification.message }}</span>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const {
  active,
  dirty,
  saving,
  canUndo,
  canRedo,
  notification,
  undo,
  redo,
  discard,
  save,
  exitEditMode,
} = useEditMode()

// Keyboard shortcuts
if (import.meta.client) {
  const handleKeydown = (e: KeyboardEvent) => {
    if (!active.value) return

    // Ctrl+Z / Cmd+Z => Undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      undo()
    }
    // Ctrl+Shift+Z / Cmd+Shift+Z => Redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault()
      redo()
    }
    // Ctrl+S / Cmd+S => Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      save()
    }
    // Escape => Exit
    if (e.key === 'Escape') {
      exitEditMode()
    }
  }

  onMounted(() => document.addEventListener('keydown', handleKeydown))
  onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
}
</script>

<style scoped>
.builder-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
}

.builder-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background: #1e293b;
  color: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-brand {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #93c5fd;
  padding: 0 8px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #334155;
  margin: 0 8px;
}

.toolbar-center {
  font-size: 12px;
}

.unsaved-indicator {
  color: #fbbf24;
  display: flex;
  align-items: center;
  gap: 6px;
}
.unsaved-indicator::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fbbf24;
}

.saved-indicator {
  color: #6b7280;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.toolbar-btn:hover:not(.disabled) {
  background: #334155;
  color: white;
}
.toolbar-btn.disabled {
  opacity: 0.3;
  cursor: default;
}

.toolbar-btn-text {
  padding: 6px 14px;
  border: 1px solid #475569;
  background: transparent;
  color: #cbd5e1;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.toolbar-btn-text:hover:not(:disabled) {
  background: #334155;
  color: white;
  border-color: #64748b;
}
.toolbar-btn-text:disabled {
  opacity: 0.4;
  cursor: default;
}

.toolbar-btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 18px;
  border: none;
  background: #3b82f6;
  color: white;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.toolbar-btn-primary:hover:not(:disabled) {
  background: #2563eb;
}
.toolbar-btn-primary:disabled {
  opacity: 0.5;
  cursor: default;
}

.toolbar-btn-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #94a3b8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.toolbar-btn-close:hover {
  background: #dc2626;
  color: white;
}

/* Toast notification */
.builder-toast {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 10001;
}

.toast-success {
  background: #065f46;
  color: #d1fae5;
}
.toast-error {
  background: #991b1b;
  color: #fee2e2;
}
.toast-info {
  background: #1e3a5f;
  color: #bfdbfe;
}

/* Transitions */
.slide-down-enter-active, .slide-down-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-down-enter-from, .slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.toast-enter-active, .toast-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}
</style>
