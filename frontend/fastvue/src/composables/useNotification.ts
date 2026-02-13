/**
 * Global Notification System
 *
 * Provides a centralized notification/toast system with support for
 * different types, durations, and actions.
 *
 * Usage:
 * ```ts
 * import { useNotification } from '#/composables';
 *
 * const { success, error, warning, info } = useNotification();
 *
 * success('Employee created successfully');
 * error('Failed to save changes', { duration: 5000 });
 * warning('Session will expire in 5 minutes');
 * info('New updates available', { action: { label: 'Refresh', onClick: () => location.reload() } });
 * ```
 */

import { reactive, readonly } from 'vue';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration: number;
  closable: boolean;
  action?: NotificationAction;
  timestamp: number;
}

export interface NotificationOptions {
  message?: string;
  duration?: number;
  closable?: boolean;
  action?: NotificationAction;
}

interface NotificationState {
  notifications: Notification[];
  maxNotifications: number;
}

// Global state
const state = reactive<NotificationState>({
  notifications: [],
  maxNotifications: 5,
});

// Generate unique ID
let notificationId = 0;
function generateId(): string {
  return `notification-${++notificationId}-${Date.now()}`;
}

// Default durations by type
const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
};

/**
 * Add a notification
 */
function addNotification(
  type: NotificationType,
  title: string,
  options: NotificationOptions = {},
): string {
  const id = generateId();
  const notification: Notification = {
    id,
    type,
    title,
    message: options.message,
    duration: options.duration ?? DEFAULT_DURATIONS[type],
    closable: options.closable ?? true,
    action: options.action,
    timestamp: Date.now(),
  };

  // Remove oldest if at max
  if (state.notifications.length >= state.maxNotifications) {
    state.notifications.shift();
  }

  state.notifications.push(notification);

  // Auto-remove after duration
  if (notification.duration > 0) {
    setTimeout(() => {
      removeNotification(id);
    }, notification.duration);
  }

  return id;
}

/**
 * Remove a notification by ID
 */
function removeNotification(id: string): void {
  const index = state.notifications.findIndex((n) => n.id === id);
  if (index > -1) {
    state.notifications.splice(index, 1);
  }
}

/**
 * Clear all notifications
 */
function clearAll(): void {
  state.notifications.splice(0, state.notifications.length);
}

/**
 * Set maximum notifications
 */
function setMaxNotifications(max: number): void {
  state.maxNotifications = max;
  // Trim if needed
  while (state.notifications.length > max) {
    state.notifications.shift();
  }
}

/**
 * Notification composable
 */
export function useNotification() {
  const success = (title: string, options?: NotificationOptions) =>
    addNotification('success', title, options);

  const error = (title: string, options?: NotificationOptions) =>
    addNotification('error', title, options);

  const warning = (title: string, options?: NotificationOptions) =>
    addNotification('warning', title, options);

  const info = (title: string, options?: NotificationOptions) =>
    addNotification('info', title, options);

  return {
    // Methods
    success,
    error,
    warning,
    info,
    remove: removeNotification,
    clearAll,
    setMaxNotifications,

    // State (readonly)
    notifications: readonly(state.notifications),
    state: readonly(state),
  };
}

/**
 * Notification container composable (for the component that renders notifications)
 */
export function useNotificationContainer() {
  return {
    notifications: readonly(state.notifications),
    remove: removeNotification,
    clearAll,
  };
}

export default useNotification;
