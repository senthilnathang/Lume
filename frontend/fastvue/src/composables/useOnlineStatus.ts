/**
 * Online Status Composable
 *
 * Provides reactive network status detection.
 *
 * Usage:
 * ```ts
 * import { useOnlineStatus } from '#/composables';
 *
 * const { isOnline, isOffline, onOnline, onOffline } = useOnlineStatus();
 *
 * watch(isOnline, (online) => {
 *   if (online) {
 *     syncData();
 *   }
 * });
 *
 * onOffline(() => {
 *   showOfflineNotification();
 * });
 * ```
 */

import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue';

export interface NetworkInformation {
  /** Connection type (wifi, cellular, etc) */
  type?: string;
  /** Effective connection type (4g, 3g, 2g, slow-2g) */
  effectiveType?: string;
  /** Estimated downlink speed (Mbps) */
  downlink?: number;
  /** Estimated round-trip time (ms) */
  rtt?: number;
  /** Data saver mode enabled */
  saveData?: boolean;
}

export interface UseOnlineStatusReturn {
  /** Whether browser is online */
  isOnline: Ref<boolean>;
  /** Whether browser is offline */
  isOffline: Ref<boolean>;
  /** Network information (if available) */
  networkInfo: Ref<NetworkInformation | null>;
  /** Register online callback */
  onOnline: (callback: () => void) => () => void;
  /** Register offline callback */
  onOffline: (callback: () => void) => () => void;
}

/**
 * Online status composable
 */
export function useOnlineStatus(): UseOnlineStatusReturn {
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const networkInfo = ref<NetworkInformation | null>(null);

  const onlineCallbacks: Set<() => void> = new Set();
  const offlineCallbacks: Set<() => void> = new Set();

  // Update network info
  function updateNetworkInfo(): void {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      networkInfo.value = {
        type: connection?.type,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
        saveData: connection?.saveData,
      };
    }
  }

  // Handle online event
  function handleOnline(): void {
    isOnline.value = true;
    updateNetworkInfo();
    onlineCallbacks.forEach((cb) => cb());
  }

  // Handle offline event
  function handleOffline(): void {
    isOnline.value = false;
    offlineCallbacks.forEach((cb) => cb());
  }

  // Handle connection change
  function handleConnectionChange(): void {
    updateNetworkInfo();
  }

  // Register callbacks
  function onOnline(callback: () => void): () => void {
    onlineCallbacks.add(callback);
    return () => onlineCallbacks.delete(callback);
  }

  function onOffline(callback: () => void): () => void {
    offlineCallbacks.add(callback);
    return () => offlineCallbacks.delete(callback);
  }

  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Network Information API
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection?.addEventListener('change', handleConnectionChange);
        updateNetworkInfo();
      }
    }
  });

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection?.removeEventListener('change', handleConnectionChange);
      }
    }
  });

  return {
    isOnline,
    isOffline: computed(() => !isOnline.value),
    networkInfo,
    onOnline,
    onOffline,
  };
}

export default useOnlineStatus;
