/**
 * Idle Detection Composable
 *
 * Detects user inactivity for session management and auto-logout.
 *
 * Usage:
 * ```ts
 * import { useIdleDetection } from '#/composables';
 *
 * const { isIdle, lastActivity, onIdle, reset } = useIdleDetection({
 *   timeout: 15 * 60 * 1000, // 15 minutes
 *   onIdle: () => {
 *     showSessionWarning();
 *   },
 * });
 * ```
 */

import { ref, onMounted, onUnmounted, type Ref } from 'vue';

export interface UseIdleDetectionOptions {
  /** Idle timeout in ms (default: 5 minutes) */
  timeout?: number;
  /** Warning time before idle (default: 1 minute before timeout) */
  warningTime?: number;
  /** Events to track for activity */
  events?: string[];
  /** Callback when user becomes idle */
  onIdle?: () => void;
  /** Callback when warning time reached */
  onWarning?: (remainingTime: number) => void;
  /** Callback when user becomes active */
  onActive?: () => void;
  /** Initial state */
  initialState?: boolean;
}

export interface UseIdleDetectionReturn {
  /** Whether user is idle */
  isIdle: Ref<boolean>;
  /** Whether in warning period */
  isWarning: Ref<boolean>;
  /** Last activity timestamp */
  lastActivity: Ref<number>;
  /** Time remaining until idle (ms) */
  remainingTime: Ref<number>;
  /** Register idle callback */
  onIdle: (callback: () => void) => () => void;
  /** Register warning callback */
  onWarning: (callback: (time: number) => void) => () => void;
  /** Register active callback */
  onActive: (callback: () => void) => () => void;
  /** Reset idle timer */
  reset: () => void;
  /** Pause idle detection */
  pause: () => void;
  /** Resume idle detection */
  resume: () => void;
  /** Whether detection is paused */
  isPaused: Ref<boolean>;
}

const DEFAULT_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'wheel',
];

/**
 * Idle detection composable
 */
export function useIdleDetection(
  options: UseIdleDetectionOptions = {},
): UseIdleDetectionReturn {
  const {
    timeout = 5 * 60 * 1000, // 5 minutes
    warningTime = 60 * 1000, // 1 minute before
    events = DEFAULT_EVENTS,
    onIdle: onIdleOption,
    onWarning: onWarningOption,
    onActive: onActiveOption,
    initialState = false,
  } = options;

  const isIdle = ref(initialState);
  const isWarning = ref(false);
  const isPaused = ref(false);
  const lastActivity = ref(Date.now());
  const remainingTime = ref(timeout);

  const idleCallbacks: Set<() => void> = new Set();
  const warningCallbacks: Set<(time: number) => void> = new Set();
  const activeCallbacks: Set<() => void> = new Set();

  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let warningTimer: ReturnType<typeof setTimeout> | null = null;
  let countdownInterval: ReturnType<typeof setInterval> | null = null;

  // Add initial callbacks
  if (onIdleOption) idleCallbacks.add(onIdleOption);
  if (onWarningOption) warningCallbacks.add(onWarningOption);
  if (onActiveOption) activeCallbacks.add(onActiveOption);

  /**
   * Clear all timers
   */
  function clearTimers(): void {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (warningTimer) {
      clearTimeout(warningTimer);
      warningTimer = null;
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  /**
   * Start countdown display
   */
  function startCountdown(): void {
    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
      const elapsed = Date.now() - lastActivity.value;
      remainingTime.value = Math.max(0, timeout - elapsed);

      if (remainingTime.value <= 0) {
        clearInterval(countdownInterval!);
        countdownInterval = null;
      }
    }, 1000);
  }

  /**
   * Handle idle state
   */
  function handleIdle(): void {
    if (isPaused.value) return;

    isIdle.value = true;
    isWarning.value = false;
    remainingTime.value = 0;

    idleCallbacks.forEach((cb) => cb());
  }

  /**
   * Handle warning state
   */
  function handleWarning(): void {
    if (isPaused.value) return;

    isWarning.value = true;
    startCountdown();

    warningCallbacks.forEach((cb) => cb(warningTime));
  }

  /**
   * Reset idle timer
   */
  function reset(): void {
    clearTimers();

    const wasIdle = isIdle.value;
    isIdle.value = false;
    isWarning.value = false;
    lastActivity.value = Date.now();
    remainingTime.value = timeout;

    if (wasIdle) {
      activeCallbacks.forEach((cb) => cb());
    }

    if (!isPaused.value) {
      // Set warning timer
      if (warningTime > 0 && timeout > warningTime) {
        warningTimer = setTimeout(handleWarning, timeout - warningTime);
      }

      // Set idle timer
      idleTimer = setTimeout(handleIdle, timeout);
    }
  }

  /**
   * Handle activity event
   */
  function handleActivity(): void {
    if (isPaused.value) return;
    reset();
  }

  /**
   * Pause idle detection
   */
  function pause(): void {
    isPaused.value = true;
    clearTimers();
  }

  /**
   * Resume idle detection
   */
  function resume(): void {
    isPaused.value = false;
    reset();
  }

  /**
   * Register callbacks
   */
  function onIdle(callback: () => void): () => void {
    idleCallbacks.add(callback);
    return () => idleCallbacks.delete(callback);
  }

  function onWarning(callback: (time: number) => void): () => void {
    warningCallbacks.add(callback);
    return () => warningCallbacks.delete(callback);
  }

  function onActive(callback: () => void): () => void {
    activeCallbacks.add(callback);
    return () => activeCallbacks.delete(callback);
  }

  onMounted(() => {
    if (typeof window !== 'undefined') {
      events.forEach((event) => {
        window.addEventListener(event, handleActivity, { passive: true });
      });

      // Initial reset
      reset();
    }
  });

  onUnmounted(() => {
    clearTimers();

    if (typeof window !== 'undefined') {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    }
  });

  return {
    isIdle,
    isWarning,
    lastActivity,
    remainingTime,
    isPaused,
    onIdle,
    onWarning,
    onActive,
    reset,
    pause,
    resume,
  };
}

export default useIdleDetection;
