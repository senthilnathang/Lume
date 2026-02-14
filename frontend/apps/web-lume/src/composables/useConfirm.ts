/**
 * Confirmation Dialog Composable
 * Promise-based wrapper around Ant Design's Modal.confirm.
 */
import { Modal } from 'ant-design-vue';
import { ExclamationCircleOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import { h } from 'vue';

export interface ConfirmOptions {
  title?: string;
  content?: string;
  okText?: string;
  cancelText?: string;
  okType?: 'primary' | 'danger' | 'default';
  icon?: any;
}

/**
 * Composable for confirmation dialogs
 *
 * @example
 * ```ts
 * const { confirm, confirmDelete } = useConfirm();
 *
 * // Generic confirm
 * const confirmed = await confirm({
 *   title: 'Publish Article?',
 *   content: 'This will make the article visible to all users.',
 * });
 * if (confirmed) { ... }
 *
 * // Delete confirm (pre-styled)
 * const confirmed = await confirmDelete('Employee Record');
 * if (confirmed) { await deleteEmployee(id); }
 * ```
 */
export function useConfirm() {
  function confirm(options: ConfirmOptions = {}): Promise<boolean> {
    return new Promise((resolve) => {
      Modal.confirm({
        title: options.title || 'Are you sure?',
        content: options.content,
        okText: options.okText || 'OK',
        cancelText: options.cancelText || 'Cancel',
        okType: options.okType || 'primary',
        icon: options.icon ? () => h(options.icon) : () => h(ExclamationCircleOutlined),
        onOk() {
          resolve(true);
        },
        onCancel() {
          resolve(false);
        },
      });
    });
  }

  function confirmDelete(itemName?: string): Promise<boolean> {
    return confirm({
      title: 'Delete Confirmation',
      content: itemName
        ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
        : 'Are you sure you want to delete this item? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      icon: DeleteOutlined,
    });
  }

  return {
    confirm,
    confirmDelete,
  };
}
