import { ref, reactive } from 'vue';

export interface ModalState {
  visible: boolean;
  title: string;
  width: string | number;
  centered: boolean;
  closable: boolean;
  maskClosable: boolean;
  keyboard: boolean;
  footer: any;
  getContainer: HTMLElement | false;
}

const defaultState: Partial<ModalState> = {
  visible: false,
  title: '',
  width: 520,
  centered: true,
  closable: true,
  maskClosable: true,
  keyboard: true,
  footer: null,
  getContainer: false,
};

export function useModal(options: Partial<ModalState> = {}) {
  const mergedOptions = { ...defaultState, ...options };

  const state = reactive<ModalState>({
    visible: mergedOptions.visible || false,
    title: mergedOptions.title || '',
    width: mergedOptions.width || 520,
    centered: mergedOptions.centered ?? true,
    closable: mergedOptions.closable ?? true,
    maskClosable: mergedOptions.maskClosable ?? true,
    keyboard: mergedOptions.keyboard ?? true,
    footer: mergedOptions.footer ?? undefined,
    getContainer: mergedOptions.getContainer ?? false,
  });

  const modalRef = ref<any>(null);

  const open = (options?: Partial<ModalState>) => {
    Object.assign(state, options);
    state.visible = true;
  };

  const close = () => {
    state.visible = false;
  };

  const update = (options: Partial<ModalState>) => {
    Object.assign(state, options);
  };

  const confirm = (options?: { title?: string; content?: string }) => {
    state.title = options?.title || 'Confirm';
    state.visible = true;
    return Promise.resolve(true);
  };

  return {
    state,
    modalRef,
    open,
    close,
    update,
    confirm,
  };
}

export interface DrawerState {
  visible: boolean;
  title: string;
  width: string | number;
  placement: 'left' | 'right';
  closable: boolean;
  maskClosable: boolean;
  keyboard: boolean;
  footer: any;
  getContainer: HTMLElement | false;
}

const defaultDrawerState: Partial<DrawerState> = {
  visible: false,
  title: '',
  width: 400,
  placement: 'right',
  closable: true,
  maskClosable: true,
  keyboard: true,
  footer: null,
  getContainer: false,
};

export function useDrawer(options: Partial<DrawerState> = {}) {
  const mergedOptions = { ...defaultDrawerState, ...options };

  const state = reactive<DrawerState>({
    visible: mergedOptions.visible || false,
    title: mergedOptions.title || '',
    width: mergedOptions.width || 400,
    placement: mergedOptions.placement || 'right',
    closable: mergedOptions.closable ?? true,
    maskClosable: mergedOptions.maskClosable ?? true,
    keyboard: mergedOptions.keyboard ?? true,
    footer: mergedOptions.footer ?? undefined,
    getContainer: mergedOptions.getContainer ?? false,
  });

  const drawerRef = ref<any>(null);

  const open = (options?: Partial<DrawerState>) => {
    Object.assign(state, options);
    state.visible = true;
  };

  const close = () => {
    state.visible = false;
  };

  const update = (options: Partial<DrawerState>) => {
    Object.assign(state, options);
  };

  return {
    state,
    drawerRef,
    open,
    close,
    update,
  };
}

export interface MessageState {
  type: 'success' | 'error' | 'warning' | 'info';
  content: string;
  duration: number;
  key?: string;
}

export function useMessage() {
  const messages = ref<MessageState[]>([]);

  const show = (options: Omit<MessageState, 'key'> & { key?: string }) => {
    const key = options.key || Date.now().toString();
    messages.value.push({
      type: options.type || 'info',
      content: options.content,
      duration: options.duration || 3000,
      key,
    });
  };

  const success = (content: string, duration?: number) => {
    show({ type: 'success', content, duration });
  };

  const error = (content: string, duration?: number) => {
    show({ type: 'error', content, duration });
  };

  const warning = (content: string, duration?: number) => {
    show({ type: 'warning', content, duration });
  };

  const info = (content: string, duration?: number) => {
    show({ type: 'info', content, duration });
  };

  const remove = (key: string) => {
    const index = messages.value.findIndex(m => m.key === key);
    if (index > -1) {
      messages.value.splice(index, 1);
    }
  };

  return {
    messages,
    show,
    success,
    error,
    warning,
    info,
    remove,
  };
}

export interface NotificationState {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  content: string;
  duration: number;
  placement: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
}

export function useNotification() {
  const notifications = ref<NotificationState[]>([]);

  const show = (options: Omit<NotificationState, 'key'>) => {
    notifications.value.push(options);
  };

  const success = (title: string, content: string, duration?: number) => {
    show({ type: 'success', title, content, duration: duration || 4500, placement: 'topRight' });
  };

  const error = (title: string, content: string, duration?: number) => {
    show({ type: 'error', title, content, duration: duration || 4500, placement: 'topRight' });
  };

  const warning = (title: string, content: string, duration?: number) => {
    show({ type: 'warning', title, content, duration: duration || 4500, placement: 'topRight' });
  };

  const info = (title: string, content: string, duration?: number) => {
    show({ type: 'info', title, content, duration: duration || 4500, placement: 'topRight' });
  };

  const remove = () => {
    notifications.value = [];
  };

  return {
    notifications,
    show,
    success,
    error,
    warning,
    info,
    remove,
  };
}
