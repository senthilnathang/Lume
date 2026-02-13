/**
 * Keyboard Shortcuts Composable
 *
 * Provides a centralized keyboard shortcut system with support for
 * key combinations, scopes, and conditional shortcuts.
 *
 * Usage:
 * ```ts
 * import { useKeyboardShortcuts } from '#/composables';
 *
 * const { register, unregister } = useKeyboardShortcuts();
 *
 * // Register a shortcut
 * register('ctrl+s', () => saveDocument(), { description: 'Save document' });
 * register('ctrl+k', () => openSearch(), { description: 'Open search', scope: 'global' });
 *
 * // With condition
 * register('escape', () => closeModal(), { when: () => isModalOpen.value });
 * ```
 */

import { onUnmounted, reactive, readonly } from 'vue';

export interface ShortcutOptions {
  description?: string;
  scope?: string;
  when?: () => boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export interface Shortcut {
  key: string;
  handler: () => void;
  options: ShortcutOptions;
}

interface ShortcutState {
  shortcuts: Map<string, Shortcut>;
  activeScope: string;
  enabled: boolean;
}

// Modifier key mapping
const MODIFIERS = {
  ctrl: 'ctrlKey',
  alt: 'altKey',
  shift: 'shiftKey',
  meta: 'metaKey',
  cmd: 'metaKey',
} as const;

// Key aliases
const KEY_ALIASES: Record<string, string> = {
  esc: 'escape',
  return: 'enter',
  space: ' ',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  del: 'delete',
};

// Global state
const state = reactive<ShortcutState>({
  shortcuts: new Map(),
  activeScope: 'global',
  enabled: true,
});

/**
 * Parse key combination string
 */
function parseKeyCombo(combo: string): { modifiers: string[]; key: string } {
  const parts = combo.toLowerCase().split('+');
  const key = parts.pop() || '';
  const modifiers = parts;

  return {
    modifiers,
    key: KEY_ALIASES[key] || key,
  };
}

/**
 * Check if key combination matches event
 */
function matchesKeyCombo(event: KeyboardEvent, combo: string): boolean {
  const { modifiers, key } = parseKeyCombo(combo);
  const eventKey = event.key.toLowerCase();

  // Check key
  if (eventKey !== key) return false;

  // Check modifiers
  for (const [mod, prop] of Object.entries(MODIFIERS)) {
    const required = modifiers.includes(mod);
    const pressed = event[prop as keyof KeyboardEvent];
    if (required !== pressed) return false;
  }

  return true;
}

/**
 * Global keyboard event handler
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (!state.enabled) return;

  // Skip if typing in input/textarea
  const target = event.target as HTMLElement;
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  ) {
    // Allow escape in inputs
    if (event.key.toLowerCase() !== 'escape') return;
  }

  for (const [combo, shortcut] of state.shortcuts) {
    // Check scope
    if (
      shortcut.options.scope &&
      shortcut.options.scope !== 'global' &&
      shortcut.options.scope !== state.activeScope
    ) {
      continue;
    }

    // Check condition
    if (shortcut.options.when && !shortcut.options.when()) {
      continue;
    }

    // Check key combo
    if (matchesKeyCombo(event, combo)) {
      if (shortcut.options.preventDefault !== false) {
        event.preventDefault();
      }
      if (shortcut.options.stopPropagation) {
        event.stopPropagation();
      }
      shortcut.handler();
      return;
    }
  }
}

// Set up global listener
let listenerAttached = false;

function attachListener(): void {
  if (!listenerAttached && typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
    listenerAttached = true;
  }
}

export function detachListener(): void {
  if (listenerAttached && typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown);
    listenerAttached = false;
  }
}

/**
 * Register a keyboard shortcut
 */
function register(
  key: string,
  handler: () => void,
  options: ShortcutOptions = {},
): () => void {
  attachListener();

  const shortcut: Shortcut = {
    key,
    handler,
    options: {
      preventDefault: true,
      ...options,
    },
  };

  state.shortcuts.set(key.toLowerCase(), shortcut);

  // Return unregister function
  return () => unregister(key);
}

/**
 * Unregister a keyboard shortcut
 */
function unregister(key: string): void {
  state.shortcuts.delete(key.toLowerCase());
}

/**
 * Set active scope
 */
function setScope(scope: string): void {
  state.activeScope = scope;
}

/**
 * Enable/disable shortcuts
 */
function setEnabled(enabled: boolean): void {
  state.enabled = enabled;
}

/**
 * Get all registered shortcuts
 */
function getShortcuts(): Shortcut[] {
  return Array.from(state.shortcuts.values());
}

/**
 * Get shortcuts for help display
 */
function getShortcutsHelp(): Array<{ key: string; description: string; scope: string }> {
  return getShortcuts()
    .filter((s) => s.options.description)
    .map((s) => ({
      key: s.key,
      description: s.options.description || '',
      scope: s.options.scope || 'global',
    }));
}

/**
 * Format key for display
 */
export function formatKey(key: string): string {
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

  return key
    .split('+')
    .map((part) => {
      const p = part.toLowerCase();
      if (p === 'ctrl') return isMac ? '⌃' : 'Ctrl';
      if (p === 'alt') return isMac ? '⌥' : 'Alt';
      if (p === 'shift') return '⇧';
      if (p === 'meta' || p === 'cmd') return isMac ? '⌘' : 'Win';
      if (p === 'enter') return '↵';
      if (p === 'escape' || p === 'esc') return 'Esc';
      if (p === 'space') return 'Space';
      if (p === 'arrowup') return '↑';
      if (p === 'arrowdown') return '↓';
      if (p === 'arrowleft') return '←';
      if (p === 'arrowright') return '→';
      return part.toUpperCase();
    })
    .join(isMac ? '' : '+');
}

/**
 * Keyboard shortcuts composable
 */
export function useKeyboardShortcuts() {
  return {
    register,
    unregister,
    setScope,
    setEnabled,
    getShortcuts,
    getShortcutsHelp,
    formatKey,
    state: readonly(state),
  };
}

/**
 * Composable for component-scoped shortcuts (auto-cleanup)
 */
export function useComponentShortcuts() {
  const registeredKeys: string[] = [];

  const registerLocal = (
    key: string,
    handler: () => void,
    options: ShortcutOptions = {},
  ): void => {
    register(key, handler, options);
    registeredKeys.push(key);
  };

  onUnmounted(() => {
    registeredKeys.forEach((key) => unregister(key));
  });

  return {
    register: registerLocal,
    setScope,
    formatKey,
  };
}

export default useKeyboardShortcuts;
