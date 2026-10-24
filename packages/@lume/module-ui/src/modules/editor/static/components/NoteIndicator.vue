<template>
  <div
    v-if="noteCount > 0"
    class="note-indicator"
    :title="`${noteCount} note${noteCount !== 1 ? 's' : ''} on this block`"
    @click.stop="onClick"
  >
    {{ noteCount > 9 ? '9+' : noteCount }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Note {
  blockId?: string | null;
  isResolved?: number;
}

const props = defineProps<{
  blockId: string;
  notes: Note[];
  onClick: () => void;
}>();

const noteCount = computed(() => {
  return props.notes.filter(
    (n) => n.blockId === props.blockId && !n.isResolved
  ).length;
});
</script>

<style scoped>
.note-indicator {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  background: #f59e0b;
  color: #fff;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.15s, background 0.15s;
  line-height: 1;
}

.note-indicator:hover {
  transform: scale(1.15);
  background: #d97706;
}
</style>
