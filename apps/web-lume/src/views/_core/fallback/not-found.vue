<template>
  <div class="lume-not-found">
    <div class="lume-not-found-content">
      <div class="lume-not-found-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M16 16s-1.5-2-4-2-4 2-4 2"></path>
          <line x1="9" y1="9" x2="9.01" y2="9"></line>
          <line x1="15" y1="9" x2="15.01" y2="9"></line>
        </svg>
      </div>
      <h1 class="lume-not-found-title">404</h1>
      <p class="lume-not-found-message">Oops! The page you're looking for doesn't exist.</p>
      <div class="lume-not-found-actions">
        <router-link to="/" class="lume-btn lume-btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Home
        </router-link>
        <button class="lume-btn lume-btn-secondary" @click="handleReload">
          Refresh Page
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const handleReload = () => {
  window.location.reload();
};
</script>

<style scoped>
.lume-not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  padding: 24px;
}

.lume-not-found-content {
  text-align: center;
  max-width: 400px;
}

.lume-not-found-icon {
  color: #d1d5db;
  margin-bottom: 24px;
}

.lume-not-found-title {
  font-size: 72px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 16px 0;
  line-height: 1;
}

.lume-not-found-message {
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 32px 0;
}

.lume-not-found-actions {
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
