/**
 * useFormView - Configurable Form View Composable
 *
 * Provides 3 interchangeable form display modes:
 * - 'page'   : Full-page form (navigates to a dedicated route)
 * - 'modal'  : Centered popup modal
 * - 'drawer' : Right-side drawer panel
 *
 * Mode preference is persisted per viewKey in localStorage.
 */

import { ref, computed } from 'vue';

const VALID_MODES = ['page', 'modal', 'drawer'];

export function useFormView(viewKey, options = {}) {
  const {
    defaultMode = 'page',
    pageRoute = '',
    modalWidth = 720,
    drawerWidth = 620,
    onClose = null,
  } = options;

  const storageKey = `formView_${viewKey}_mode`;

  function loadMode() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && VALID_MODES.includes(saved)) return saved;
    } catch (e) {
      // localStorage unavailable
    }
    return defaultMode;
  }

  const mode = ref(loadMode());

  function setMode(newMode) {
    if (!VALID_MODES.includes(newMode)) return;
    mode.value = newMode;
    try {
      localStorage.setItem(storageKey, newMode);
    } catch (e) {
      // localStorage unavailable
    }
  }

  const formId = ref(null);
  const formData = ref(null);
  const modalVisible = ref(false);
  const drawerVisible = ref(false);

  const isPageMode = computed(() => mode.value === 'page');
  const isModalMode = computed(() => mode.value === 'modal');
  const isDrawerMode = computed(() => mode.value === 'drawer');
  const isOpen = computed(() => modalVisible.value || drawerVisible.value);

  function openForm(id = null, data = null) {
    formId.value = id;
    formData.value = data;

    if (mode.value === 'page') {
      if (!pageRoute) {
        console.warn('[useFormView] pageRoute not configured, falling back to modal');
        modalVisible.value = true;
        return;
      }
      const router = window.__VUE_ROUTER__;
      if (router) {
        const query = id ? { id: String(id) } : {};
        router.push({ path: pageRoute, query });
      }
    } else if (mode.value === 'modal') {
      modalVisible.value = true;
    } else if (mode.value === 'drawer') {
      drawerVisible.value = true;
    }
  }

  function closeForm() {
    modalVisible.value = false;
    drawerVisible.value = false;
    formId.value = null;
    formData.value = null;
    if (onClose) onClose();
  }

  return {
    mode,
    setMode,
    isPageMode,
    isModalMode,
    isDrawerMode,
    formId,
    formData,
    modalVisible,
    drawerVisible,
    isOpen,
    openForm,
    closeForm,
    modalWidth,
    drawerWidth,
  };
}
