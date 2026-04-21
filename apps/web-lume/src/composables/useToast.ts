import { ref } from 'vue';

interface Toast {
  duration?: number;
  id: number;
  message: string;
  type: 'error' | 'info' | 'success' | 'warning';
}

const toasts = ref<Toast[]>([]);
let toastId = 0;

export function useToast() {
  function toast(options: Omit<Toast, 'id'>) {
    const id = ++toastId;
    toasts.value.push({ ...options, id });

    if (options.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, options.duration || 3000);
    }

    return id;
  }

  function removeToast(id: number) {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  }

  function success(message: string, duration?: number) {
    return toast({ duration, message, type: 'success' });
  }

  function error(message: string, duration?: number) {
    return toast({ duration, message, type: 'error' });
  }

  function warning(message: string, duration?: number) {
    return toast({ duration, message, type: 'warning' });
  }

  function info(message: string, duration?: number) {
    return toast({ duration, message, type: 'info' });
  }

  return {
    error,
    info,
    removeToast,
    success,
    toasts,
    toast,
    warning,
  };
}
