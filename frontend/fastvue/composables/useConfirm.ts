import { ref } from 'vue';
import { Modal, message } from 'ant-design-vue';
import { ExclamationCircleOutlined } from '@ant-design/icons-vue';
import { h } from 'vue';

export interface ConfirmOptions {
  title?: string;
  content?: string;
  okText?: string;
  cancelText?: string;
  okType?: 'primary' | 'default' | 'dashed' | 'link' | 'text' | 'danger';
  icon?: any;
}

export interface UseConfirmReturn {
  confirm: (options?: ConfirmOptions) => Promise<boolean>;
  confirmDelete: (itemName?: string) => Promise<boolean>;
  confirmAction: (action: string, itemName?: string) => Promise<boolean>;
}

export function useConfirm(): UseConfirmReturn {
  async function confirm(options: ConfirmOptions = {}): Promise<boolean> {
    const {
      title = 'Confirm',
      content = 'Are you sure you want to proceed?',
      okText = 'Yes',
      cancelText = 'No',
      okType = 'primary',
      icon,
    } = options;

    return new Promise((resolve) => {
      Modal.confirm({
        title,
        content,
        okText,
        cancelText,
        okType,
        icon: icon || h(ExclamationCircleOutlined),
        onOk() {
          resolve(true);
        },
        onCancel() {
          resolve(false);
        },
      });
    });
  }

  async function confirmDelete(itemName?: string): Promise<boolean> {
    return confirm({
      title: 'Delete Confirmation',
      content: itemName
        ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
        : 'Are you sure you want to delete this item? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
    });
  }

  async function confirmAction(action: string, itemName?: string): Promise<boolean> {
    return confirm({
      title: `Confirm ${action}`,
      content: itemName
        ? `Are you sure you want to ${action.toLowerCase()} "${itemName}"?`
        : `Are you sure you want to ${action.toLowerCase()} this item?`,
      okText: action,
    });
  }

  return {
    confirm,
    confirmDelete,
    confirmAction,
  };
}

/**
 * Composable for handling async operations with loading state and feedback
 */
export interface UseAsyncActionOptions {
  successMessage?: string;
  errorMessage?: string;
  showSuccessMessage?: boolean;
  showErrorMessage?: boolean;
}

export function useAsyncAction() {
  const loading = ref(false);

  async function execute<T>(
    action: () => Promise<T>,
    options: UseAsyncActionOptions = {}
  ): Promise<{ success: boolean; data?: T; error?: Error }> {
    const {
      successMessage,
      errorMessage = 'Operation failed',
      showSuccessMessage = true,
      showErrorMessage = true,
    } = options;

    loading.value = true;

    try {
      const data = await action();
      if (successMessage && showSuccessMessage) {
        message.success(successMessage);
      }
      return { success: true, data };
    } catch (e) {
      const error = e as Error;
      if (showErrorMessage) {
        message.error(errorMessage);
      }
      console.error('useAsyncAction error:', error);
      return { success: false, error };
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    execute,
  };
}
