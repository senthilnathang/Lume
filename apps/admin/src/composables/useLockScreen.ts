import { ref } from 'vue';

const locked = ref(false);
const lastActivity = ref(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;
let timeoutMinutes = 0;

function touch() {
  lastActivity.value = Date.now();
}

function startTimer() {
  stopTimer();
  if (timeoutMinutes <= 0) return;
  timer = setInterval(() => {
    if (Date.now() - lastActivity.value >= timeoutMinutes * 60 * 1000) {
      lock();
    }
  }, 30 * 1000);
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function lock() {
  locked.value = true;
}

export function unlock() {
  locked.value = false;
  touch();
}

export function setAutoLock(minutes: number) {
  timeoutMinutes = Math.max(0, minutes);
  if (timeoutMinutes > 0) {
    window.addEventListener('mousemove', touch, { passive: true });
    window.addEventListener('keydown', touch);
    startTimer();
  } else {
    stopTimer();
  }
}

export function useLockScreen() {
  return { locked, lock, unlock, setAutoLock, touch };
}
