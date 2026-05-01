<template>
  <div class="auth-layout">
    <div class="auth-gradient" />
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">
          <span class="logo-text">Lume</span>
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.auth-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: 0;
}

.auth-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
  padding: 24px;
}

.auth-card {
  background: white;
  border-radius: 8px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.auth-logo {
  text-align: center;
  margin-bottom: 30px;
}

.logo-text {
  font-size: 28px;
  font-weight: bold;
  color: #333;
}
</style>
