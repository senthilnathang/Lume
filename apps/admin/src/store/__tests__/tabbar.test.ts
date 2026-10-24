import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTabBarStore } from '../tabbar';

describe('tabbar store (vben port)', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('opens dashboard home tab by default', () => {
    const store = useTabBarStore();
    expect(store.tabs).toHaveLength(1);
    expect(store.tabs[0]).toMatchObject({ key: '/dashboard', pinned: true });
  });

  it('opens, deduplicates, and skips auth routes', () => {
    const store = useTabBarStore();
    store.openTab('/a', 'A');
    store.openTab('/a', 'A');
    store.openTab('/login', 'Login');
    expect(store.tabs.map((t) => t.key)).toEqual(['/dashboard', '/a']);
  });

  it('closes with fallback and protects pinned tabs', () => {
    const store = useTabBarStore();
    store.openTab('/a', 'A');
    store.openTab('/b', 'B');
    expect(store.closeTab('/dashboard')).toBeNull();
    expect(store.closeTab('/b')).toBe('/a');
    expect(store.tabs.map((t) => t.key)).toEqual(['/dashboard', '/a']);
  });

  it('supports close others/left/right/all with pin protection', () => {
    const store = useTabBarStore();
    store.openTab('/a', 'A');
    store.openTab('/b', 'B');
    store.openTab('/c', 'C');
    store.closeLeftTabs('/b');
    expect(store.tabs.map((t) => t.key)).toEqual(['/dashboard', '/b', '/c']);
    store.closeRightTabs('/b');
    expect(store.tabs.map((t) => t.key)).toEqual(['/dashboard', '/b']);
    store.closeOtherTabs('/b');
    expect(store.tabs.map((t) => t.key)).toEqual(['/dashboard', '/b']);
    store.closeAllTabs();
    expect(store.tabs.map((t) => t.key)).toEqual(['/dashboard']);
  });

  it('toggles pin except on home tab', () => {
    const store = useTabBarStore();
    store.openTab('/a', 'A');
    store.togglePin('/a');
    expect(store.tabs.find((t) => t.key === '/a')?.pinned).toBe(true);
    store.togglePin('/dashboard');
    expect(store.tabs[0].pinned).toBe(true);
  });

  it('persists across store instances', () => {
    const first = useTabBarStore();
    first.openTab('/a', 'A');
    setActivePinia(createPinia());
    const second = useTabBarStore();
    expect(second.tabs.map((t) => t.key)).toEqual(['/dashboard', '/a']);
  });
});
