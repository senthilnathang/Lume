<template>
  <Teleport to="body">
    <Transition name="fade">
      <button
        v-if="isAdmin && !editActive"
        class="edit-toggle-btn"
        title="Edit this page"
        @click="handleEdit"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
        <span>Edit Page</span>
      </button>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { isAdmin } = useAuth()
const { active: editActive } = useEditMode()

const emit = defineEmits(['enter-edit'])

function handleEdit() {
  emit('enter-edit')
}
</script>

<style scoped>
.edit-toggle-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4), 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  letter-spacing: 0.01em;
}

.edit-toggle-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(59, 130, 246, 0.5), 0 4px 8px rgba(0, 0, 0, 0.1);
}

.edit-toggle-btn:active {
  transform: translateY(0);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
