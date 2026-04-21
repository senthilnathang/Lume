import { computed, ref, watch } from 'vue';

export function useScrollLock(lock = false) {
  const locked = ref(false);

  watch(
    () => lock,
    (newValue) => {
      if (newValue) {
        document.body.style.overflow = 'hidden';
        locked.value = true;
      } else {
        document.body.style.overflow = '';
        locked.value = false;
      }
    },
    { immediate: true },
  );

  const isLocked = computed(() => locked.value);

  return {
    isLocked,
  };
}
