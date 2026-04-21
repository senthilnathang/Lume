<template>
  <div class="lume-forbidden">
    <div class="lume-forbidden-content">
      <div class="lume-forbidden-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
        </svg>
      </div>
      <h1 class="lume-forbidden-title">403</h1>
      <p class="lume-forbidden-message">Sorry, you don't have permission to access this page.</p>
      <div class="lume-forbidden-actions">
        <router-link to="/" class="lume-btn lume-btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          Go to Dashboard
        </router-link>
        <button class="lume-btn lume-btn-secondary" @click="handleGoBack">
          Go Back
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const handleGoBack = () => {
  window.history.back();
};
</script>

<style scoped>
.lume-forbidden {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  padding: 24px;
}

.lume-forbidden-content {
  text-align: center;
  max-width: 400px;
}

.lume-forbidden-icon {
  color: #f59e0b;
  margin-bottom: 24px;
}

.lume-forbidden-title {
  font-size: 72px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 16px 0;
  line-height: 1;
}

.lume-forbidden-message {
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 32px 0;
}

.lume-forbidden-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.lume-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.lume-btn-primary {
  background: #4f46e5;
  border: none;
  color: white;
}

.lume-btn-primary:hover {
  background: #4338ca;
}

.lume-btn-secondary {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.lume-btn-secondary:hover {
  background: #f9fafb;
}
</style>
