import { ref, computed, type Ref, type ComputedRef } from 'vue';

export type ModalMode = 'create' | 'edit' | 'view';

export interface UseModalOptions {
  defaultMode?: ModalMode;
}

export interface UseModalReturn<T> {
  visible: Ref<boolean>;
  mode: Ref<ModalMode>;
  loading: Ref<boolean>;
  selectedItem: Ref<T | null>;
  editingId: Ref<number | null>;
  isCreateMode: ComputedRef<boolean>;
  isEditMode: ComputedRef<boolean>;
  isViewMode: ComputedRef<boolean>;
  modalTitle: ComputedRef<string>;
  openCreate: () => void;
  openEdit: (item: T, id: number) => void;
  openView: (item: T, id: number) => void;
  close: () => void;
  setLoading: (value: boolean) => void;
}

export function useModal<T>(
  entityName: string,
  options: UseModalOptions = {}
): UseModalReturn<T> {
  const { defaultMode = 'create' } = options;

  const visible = ref(false);
  const mode = ref<ModalMode>(defaultMode);
  const loading = ref(false);
  const selectedItem = ref<T | null>(null) as Ref<T | null>;
  const editingId = ref<number | null>(null);

  const isCreateMode = computed(() => mode.value === 'create');
  const isEditMode = computed(() => mode.value === 'edit');
  const isViewMode = computed(() => mode.value === 'view');

  const modalTitle = computed(() => {
    switch (mode.value) {
      case 'create':
        return `Create ${entityName}`;
      case 'edit':
        return `Edit ${entityName}`;
      case 'view':
        return `${entityName} Details`;
      default:
        return entityName;
    }
  });

  function openCreate() {
    mode.value = 'create';
    selectedItem.value = null;
    editingId.value = null;
    visible.value = true;
  }

  function openEdit(item: T, id: number) {
    mode.value = 'edit';
    selectedItem.value = item;
    editingId.value = id;
    visible.value = true;
  }

  function openView(item: T, id: number) {
    mode.value = 'view';
    selectedItem.value = item;
    editingId.value = id;
    visible.value = true;
  }

  function close() {
    visible.value = false;
    loading.value = false;
  }

  function setLoading(value: boolean) {
    loading.value = value;
  }

  return {
    visible,
    mode,
    loading,
    selectedItem,
    editingId,
    isCreateMode,
    isEditMode,
    isViewMode,
    modalTitle,
    openCreate,
    openEdit,
    openView,
    close,
    setLoading,
  };
}
