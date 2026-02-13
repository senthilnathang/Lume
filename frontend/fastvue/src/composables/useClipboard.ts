/**
 * Clipboard Composable
 *
 * Provides clipboard read/write functionality with fallback support.
 *
 * Usage:
 * ```ts
 * import { useClipboard } from '#/composables';
 *
 * const { copy, paste, copied, text } = useClipboard();
 *
 * await copy('Hello World');
 * if (copied.value) {
 *   console.log('Copied!');
 * }
 * ```
 */

import { ref, type Ref } from 'vue';

export interface UseClipboardOptions {
  /** Duration to show copied state (ms) */
  copiedDuration?: number;
  /** Legacy fallback for older browsers */
  legacy?: boolean;
}

export interface UseClipboardReturn {
  /** Whether content was recently copied */
  copied: Ref<boolean>;
  /** Current clipboard text (after paste) */
  text: Ref<string>;
  /** Whether clipboard API is supported */
  isSupported: boolean;
  /** Copy text to clipboard */
  copy: (text: string) => Promise<boolean>;
  /** Read text from clipboard */
  paste: () => Promise<string>;
}

/**
 * Check if Clipboard API is supported
 */
function isClipboardSupported(): boolean {
  return typeof navigator !== 'undefined' && 'clipboard' in navigator;
}

/**
 * Legacy copy using execCommand
 */
function legacyCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const result = document.execCommand('copy');
    document.body.removeChild(textarea);
    return result;
  } catch {
    document.body.removeChild(textarea);
    return false;
  }
}

/**
 * Clipboard composable
 */
export function useClipboard(options: UseClipboardOptions = {}): UseClipboardReturn {
  const { copiedDuration = 1500, legacy = true } = options;

  const copied = ref(false);
  const text = ref('');
  const isSupported = isClipboardSupported();

  let copiedTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Copy text to clipboard
   */
  async function copy(value: string): Promise<boolean> {
    try {
      if (isSupported) {
        await navigator.clipboard.writeText(value);
      } else if (legacy) {
        const success = legacyCopy(value);
        if (!success) return false;
      } else {
        return false;
      }

      text.value = value;
      copied.value = true;

      // Reset copied state after duration
      if (copiedTimeout) {
        clearTimeout(copiedTimeout);
      }
      copiedTimeout = setTimeout(() => {
        copied.value = false;
      }, copiedDuration);

      return true;
    } catch (error) {
      console.error('[Clipboard] Copy failed:', error);
      return false;
    }
  }

  /**
   * Read text from clipboard
   */
  async function paste(): Promise<string> {
    try {
      if (isSupported) {
        const value = await navigator.clipboard.readText();
        text.value = value;
        return value;
      }
      return '';
    } catch (error) {
      console.error('[Clipboard] Paste failed:', error);
      return '';
    }
  }

  return {
    copied,
    text,
    isSupported,
    copy,
    paste,
  };
}

export default useClipboard;
