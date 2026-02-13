/**
 * Command Palette Composable
 *
 * Provides a global command palette (Ctrl+K) for quick navigation and actions.
 *
 * Usage:
 * ```ts
 * import { useCommandPalette } from '#/composables';
 *
 * const { open, close, registerCommand, search } = useCommandPalette();
 *
 * // Register commands
 * registerCommand({
 *   id: 'go-employees',
 *   title: 'Go to Employees',
 *   category: 'Navigation',
 *   handler: () => router.push('/employee'),
 * });
 * ```
 */

import { computed, reactive, readonly } from 'vue';
import { useRouter } from 'vue-router';

export interface Command {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  icon?: string;
  shortcut?: string;
  handler: () => void | Promise<void>;
  keywords?: string[];
}

interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  commands: Command[];
  recentCommands: string[];
}

// Global state
const state = reactive<CommandPaletteState>({
  isOpen: false,
  query: '',
  selectedIndex: 0,
  commands: [],
  recentCommands: [],
});

// Load recent commands from localStorage
function loadRecentCommands(): void {
  try {
    const stored = localStorage.getItem('app-recent-commands');
    if (stored) {
      state.recentCommands = JSON.parse(stored);
    }
  } catch {
    state.recentCommands = [];
  }
}

// Save recent commands to localStorage
function saveRecentCommands(): void {
  try {
    localStorage.setItem('app-recent-commands', JSON.stringify(state.recentCommands));
  } catch {
    // Ignore storage errors
  }
}

// Add to recent commands
function addToRecent(commandId: string): void {
  state.recentCommands = [
    commandId,
    ...state.recentCommands.filter((id) => id !== commandId),
  ].slice(0, 5);
  saveRecentCommands();
}

/**
 * Open command palette
 */
function open(): void {
  state.isOpen = true;
  state.query = '';
  state.selectedIndex = 0;
}

/**
 * Close command palette
 */
function close(): void {
  state.isOpen = false;
  state.query = '';
  state.selectedIndex = 0;
}

/**
 * Toggle command palette
 */
function toggle(): void {
  if (state.isOpen) {
    close();
  } else {
    open();
  }
}

/**
 * Register a command
 */
function registerCommand(command: Command): () => void {
  // Check for duplicate
  const existing = state.commands.findIndex((c) => c.id === command.id);
  if (existing > -1) {
    state.commands[existing] = command;
  } else {
    state.commands.push(command);
  }

  // Return unregister function
  return () => unregisterCommand(command.id);
}

/**
 * Register multiple commands
 */
function registerCommands(commands: Command[]): () => void {
  const unregisters = commands.map((cmd) => registerCommand(cmd));
  return () => unregisters.forEach((fn) => fn());
}

/**
 * Unregister a command
 */
function unregisterCommand(id: string): void {
  const index = state.commands.findIndex((c) => c.id === id);
  if (index > -1) {
    state.commands.splice(index, 1);
  }
}

/**
 * Set search query
 */
function setQuery(query: string): void {
  state.query = query;
  state.selectedIndex = 0;
}

/**
 * Execute a command
 */
async function executeCommand(command: Command): Promise<void> {
  addToRecent(command.id);
  close();
  await command.handler();
}

/**
 * Execute selected command
 */
async function executeSelected(): Promise<void> {
  const results = getFilteredCommands();
  if (results[state.selectedIndex]) {
    await executeCommand(results[state.selectedIndex]!);
  }
}

/**
 * Navigate selection
 */
function navigateSelection(direction: 'up' | 'down'): void {
  const results = getFilteredCommands();
  if (direction === 'up') {
    state.selectedIndex = Math.max(0, state.selectedIndex - 1);
  } else {
    state.selectedIndex = Math.min(results.length - 1, state.selectedIndex + 1);
  }
}

/**
 * Set selected index
 */
function setSelectedIndex(index: number): void {
  state.selectedIndex = index;
}

/**
 * Get filtered commands based on query
 */
function getFilteredCommands(): Command[] {
  const query = state.query.toLowerCase().trim();

  if (!query) {
    // Show recent commands first, then all
    const recentSet = new Set(state.recentCommands);
    const recent = state.recentCommands
      .map((id) => state.commands.find((c) => c.id === id))
      .filter(Boolean) as Command[];

    const others = state.commands.filter((c) => !recentSet.has(c.id));

    return [...recent, ...others];
  }

  // Score and filter commands
  const scored = state.commands
    .map((command) => {
      let score = 0;

      // Title match
      if (command.title.toLowerCase().includes(query)) {
        score += 10;
        if (command.title.toLowerCase().startsWith(query)) {
          score += 5;
        }
      }

      // Category match
      if (command.category.toLowerCase().includes(query)) {
        score += 3;
      }

      // Subtitle match
      if (command.subtitle?.toLowerCase().includes(query)) {
        score += 2;
      }

      // Keywords match
      if (command.keywords?.some((k) => k.toLowerCase().includes(query))) {
        score += 5;
      }

      // Recent bonus
      if (state.recentCommands.includes(command.id)) {
        score += 2;
      }

      return { command, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((item) => item.command);
}

/**
 * Get commands grouped by category
 */
function getGroupedCommands(): Map<string, Command[]> {
  const filtered = getFilteredCommands();
  const grouped = new Map<string, Command[]>();

  for (const command of filtered) {
    const category = command.category;
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(command);
  }

  return grouped;
}

/**
 * Command palette composable
 */
export function useCommandPalette() {
  // Load recent on first use
  if (state.recentCommands.length === 0) {
    loadRecentCommands();
  }

  const filteredCommands = computed(() => getFilteredCommands());
  const groupedCommands = computed(() => getGroupedCommands());

  return {
    // State
    isOpen: computed(() => state.isOpen),
    query: computed(() => state.query),
    selectedIndex: computed(() => state.selectedIndex),
    commands: readonly(state.commands),
    filteredCommands,
    groupedCommands,

    // Methods
    open,
    close,
    toggle,
    setQuery,
    registerCommand,
    registerCommands,
    unregisterCommand,
    executeCommand,
    executeSelected,
    navigateSelection,
    setSelectedIndex,
  };
}

/**
 * Setup default navigation commands
 */
export function setupNavigationCommands(): () => void {
  const router = useRouter();

  const navigationCommands: Command[] = [
    // Dashboard
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      category: 'Navigation',
      icon: 'lucide:layout-dashboard',
      keywords: ['home', 'overview'],
      handler: () => { router.push('/dashboard'); },
    },

    // Employee
    {
      id: 'nav-employee',
      title: 'Go to Employees',
      category: 'Navigation',
      icon: 'lucide:users',
      keywords: ['staff', 'people', 'team'],
      handler: () => { router.push('/employee'); },
    },
    {
      id: 'nav-employee-add',
      title: 'Add New Employee',
      category: 'Actions',
      icon: 'lucide:user-plus',
      handler: () => { router.push('/employee/add'); },
    },

    // Attendance
    {
      id: 'nav-attendance',
      title: 'Go to Attendance',
      category: 'Navigation',
      icon: 'lucide:clock',
      keywords: ['time', 'check-in'],
      handler: () => { router.push('/attendance'); },
    },

    // Leave
    {
      id: 'nav-leave',
      title: 'Go to Leave Management',
      category: 'Navigation',
      icon: 'lucide:calendar-off',
      keywords: ['vacation', 'time-off', 'holiday'],
      handler: () => { router.push('/leave'); },
    },
    {
      id: 'nav-leave-request',
      title: 'Request Leave',
      category: 'Actions',
      icon: 'lucide:calendar-plus',
      handler: () => { router.push('/leave/request'); },
    },

    // Payroll
    {
      id: 'nav-payroll',
      title: 'Go to Payroll',
      category: 'Navigation',
      icon: 'lucide:wallet',
      keywords: ['salary', 'payment', 'money'],
      handler: () => { router.push('/payroll'); },
    },

    // Recruitment
    {
      id: 'nav-recruitment',
      title: 'Go to Recruitment',
      category: 'Navigation',
      icon: 'lucide:user-plus',
      keywords: ['hiring', 'jobs', 'candidates'],
      handler: () => { router.push('/recruitment'); },
    },

    // Assets
    {
      id: 'nav-assets',
      title: 'Go to Assets',
      category: 'Navigation',
      icon: 'lucide:box',
      keywords: ['equipment', 'inventory'],
      handler: () => { router.push('/asset'); },
    },

    // Settings
    {
      id: 'nav-settings',
      title: 'Go to Settings',
      category: 'Navigation',
      icon: 'lucide:settings',
      handler: () => { router.push('/settings'); },
    },
  ];

  return registerCommands(navigationCommands);
}

export default useCommandPalette;
