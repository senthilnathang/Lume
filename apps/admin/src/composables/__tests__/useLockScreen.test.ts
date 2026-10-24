import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLockScreen, lock, unlock, setAutoLock } from '../useLockScreen';

describe('useLockScreen (vben port)', () => {
  beforeEach(() => {
    unlock();
    setAutoLock(0);
    vi.useRealTimers();
  });

  it('locks and unlocks', () => {
    const { locked } = useLockScreen();
    expect(locked.value).toBe(false);
    lock();
    expect(locked.value).toBe(true);
    unlock();
    expect(locked.value).toBe(false);
  });

  it('auto-locks after inactivity', () => {
    vi.useFakeTimers();
    setAutoLock(1);
    const { locked, touch } = useLockScreen();
    touch();
    vi.advanceTimersByTime(31000);
    expect(locked.value).toBe(false);
    vi.advanceTimersByTime(31000);
    expect(locked.value).toBe(true);
    setAutoLock(0);
    unlock();
  });
});
