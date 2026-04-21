<template>
  <div class="lume-login-page">
    <div class="lume-login-container">
      <div class="lume-login-left">
        <div class="lume-login-branding">
          <div class="lume-login-logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </div>
          <h1 class="lume-login-title">Lume</h1>
          <p class="lume-login-subtitle">Modular Light Framework</p>
        </div>
        
        <div class="lume-login-features">
          <div class="feature-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>Secure Authentication</span>
          </div>
          <div class="feature-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            <span>Modular Architecture</span>
          </div>
          <div class="feature-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <span>Real-time Analytics</span>
          </div>
        </div>
      </div>

      <div class="lume-login-right">
        <div class="lume-login-form-container">
          <div class="lume-login-header">
            <h2>Welcome back</h2>
            <p>Enter your credentials to access your account</p>
          </div>

          <form class="lume-login-form" @submit.prevent="handleLogin">
            <div v-if="errorMessage" class="lume-login-error">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {{ errorMessage }}
            </div>

            <div class="lume-form-group">
              <label for="email">Email</label>
              <div class="lume-input-wrapper" :class="{ error: errors.email }">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <input
                  id="email"
                  v-model="form.email"
                  type="email"
                  placeholder="Enter your email"
                  :disabled="loading"
                  required
                />
              </div>
              <span v-if="errors.email" class="lume-field-error">{{ errors.email }}</span>
            </div>

            <div class="lume-form-group">
              <label for="password">Password</label>
              <div class="lume-input-wrapper" :class="{ error: errors.password }">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input
                  id="password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Enter your password"
                  :disabled="loading"
                  required
                />
                <button
                  type="button"
                  class="lume-toggle-password"
                  @click="showPassword = !showPassword"
                >
                  <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                </button>
              </div>
              <span v-if="errors.password" class="lume-field-error">{{ errors.password }}</span>
            </div>

            <div class="lume-form-options">
              <label class="lume-checkbox">
                <input v-model="form.remember" type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#" class="lume-forgot-password">Forgot password?</a>
            </div>

            <button type="submit" class="lume-login-btn" :disabled="loading">
              <span v-if="loading" class="lume-btn-spinner"></span>
              <span v-else>Sign in</span>
            </button>
          </form>

          <div class="lume-login-footer">
            <p>Don't have an account? <a href="#">Contact Administrator</a></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/store/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const loading = ref(false);
const showPassword = ref(false);
const errorMessage = ref('');

const form = reactive({
  email: '',
  password: '',
  remember: false,
});

const errors = reactive({
  email: '',
  password: '',
});

const validateForm = (): boolean => {
  let valid = true;
  errors.email = '';
  errors.password = '';

  if (!form.email) {
    errors.email = 'Email is required';
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email';
    valid = false;
  }

  if (!form.password) {
    errors.password = 'Password is required';
    valid = false;
  } else if (form.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
    valid = false;
  }

  return valid;
};

const handleLogin = async () => {
  if (!validateForm()) return;

  loading.value = true;
  errorMessage.value = '';

  try {
    const success = await authStore.login({
      email: form.email,
      password: form.password,
    });

    if (success) {
      const redirect = route.query.redirect as string || '/dashboard';
      router.push(redirect);
    } else {
      errorMessage.value = 'Invalid email or password';
    }
  } catch (error) {
    errorMessage.value = 'An error occurred. Please try again.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.lume-login-page {
  min-height: 100vh;
  background: #f8fafc;
}

.lume-login-container {
  display: flex;
  min-height: 100vh;
}

.lume-login-left {
  flex: 1;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: white;
}

.lume-login-branding {
  margin-bottom: 64px;
}

.lume-login-logo {
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.lume-login-title {
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.lume-login-subtitle {
  font-size: 16px;
  opacity: 0.8;
  margin: 0;
}

.lume-login-features {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 16px;
  font-weight: 500;
}

.lume-login-right {
  width: 520px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.lume-login-form-container {
  width: 100%;
  max-width: 384px;
}

.lume-login-header {
  margin-bottom: 32px;
}

.lume-login-header h2 {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px 0;
}

.lume-login-header p {
  font-size: 15px;
  color: #6b7280;
  margin: 0;
}

.lume-login-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
  margin-bottom: 24px;
}

.lume-form-group {
  margin-bottom: 20px;
}

.lume-form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.lume-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  transition: all 0.2s;
}

.lume-input-wrapper:focus-within {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.lume-input-wrapper.error {
  border-color: #ef4444;
}

.lume-input-wrapper svg {
  color: #9ca3af;
  flex-shrink: 0;
}

.lume-input-wrapper input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  color: #111827;
}

.lume-input-wrapper input::placeholder {
  color: #9ca3af;
}

.lume-toggle-password {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #9ca3af;
  display: flex;
  align-items: center;
}

.lume-toggle-password:hover {
  color: #6b7280;
}

.lume-field-error {
  display: block;
  margin-top: 6px;
  font-size: 13px;
  color: #ef4444;
}

.lume-form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.lume-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
}

.lume-checkbox input {
  width: 16px;
  height: 16px;
  accent-color: #4f46e5;
}

.lume-forgot-password {
  font-size: 14px;
  color: #4f46e5;
  text-decoration: none;
}

.lume-forgot-password:hover {
  text-decoration: underline;
}

.lume-login-btn {
  width: 100%;
  padding: 14px;
  background: #4f46e5;
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lume-login-btn:hover:not(:disabled) {
  background: #4338ca;
}

.lume-login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.lume-btn-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.lume-login-footer {
  margin-top: 32px;
  text-align: center;
  font-size: 14px;
  color: #6b7280;
}

.lume-login-footer a {
  color: #4f46e5;
  text-decoration: none;
}

.lume-login-footer a:hover {
  text-decoration: underline;
}

@media (max-width: 1024px) {
  .lume-login-left {
    display: none;
  }

  .lume-login-right {
    width: 100%;
  }
}
</style>
