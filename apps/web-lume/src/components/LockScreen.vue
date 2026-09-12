<template>
  <div v-if="locked" class="lume-lock">
    <div class="lume-lock-clock">
      <div class="lume-lock-time">{{ hour }}:{{ minute }}</div>
      <div class="lume-lock-date">{{ today }}</div>
    </div>
    <a-avatar :size="72" :src="avatar || undefined">
      {{ initials }}
    </a-avatar>
    <div class="lume-lock-name">{{ displayName }}</div>
    <a-form layout="inline" @submit.prevent="submit">
      <a-form-item :validate-status="error ? 'error' : ''" :help="error">
        <a-input-password
          v-model:value="password"
          placeholder="Enter password to unlock"
          size="large"
          :disabled="checking"
          @press-enter="submit"
        />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" size="large" :loading="checking" @click="submit">Unlock</a-button>
      </a-form-item>
    </a-form>
    <a-button type="link" @click="logout">Sign in as someone else</a-button>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue';
import { post } from '@/api/request';
import { useAuthStore } from '@/store/auth';
import { useLockScreen } from '@/composables/useLockScreen';

const authStore = useAuthStore();
const { locked, unlock } = useLockScreen();

const password = ref('');
const error = ref('');
const checking = ref(false);

const now = ref(new Date());
setInterval(() => { now.value = new Date(); }, 10000);

const hour = computed(() => String(now.value.getHours()).padStart(2, '0'));
const minute = computed(() => String(now.value.getMinutes()).padStart(2, '0'));
const today = computed(() => now.value.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

const email = computed(() => authStore.userInfo?.email || '');
const displayName = computed(() => authStore.userName || email.value || 'Locked');
const avatar = computed(() => authStore.userAvatar || '');
const initials = computed(() => displayName.value.split(/[\s@.]+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase());

async function submit() {
  if (!password.value || checking.value) return;
  checking.value = true;
  error.value = '';
  try {
    await post<{ token: string }>('/users/login', { email: email.value, password: password.value });
    password.value = '';
    unlock();
  } catch {
    error.value = 'Incorrect password';
  } finally {
    checking.value = false;
  }
}

async function logout() {
  password.value = '';
  unlock();
  await authStore.logout();
  window.location.href = '/login';
}
</script>
<style scoped>
.lume-lock {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
  color: #fff;
}
.lume-lock-clock {
  text-align: center;
  margin-bottom: 8px;
}
.lume-lock-time {
  font-size: 72px;
  font-weight: 200;
  line-height: 1;
  letter-spacing: 2px;
}
.lume-lock-date {
  font-size: 15px;
  opacity: 0.8;
  margin-top: 4px;
}
.lume-lock-name {
  font-size: 18px;
  font-weight: 600;
}
</style>
