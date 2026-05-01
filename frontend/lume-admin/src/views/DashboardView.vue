<template>
  <div class="dashboard-container">
    <a-layout>
      <a-layout-header class="header">
        <div class="header-content">
          <h1>Lume Admin Dashboard</h1>
          <a-button @click="logout" danger>Logout</a-button>
        </div>
      </a-layout-header>
      <a-layout-content class="content">
        <div class="welcome-box">
          <h2>Welcome to Lume Admin</h2>
          <p>Frontend is running successfully on port 5173</p>
          <p>Backend is running on localhost:3000</p>
          <a-space>
            <a-button type="primary">View Modules</a-button>
            <a-button>Settings</a-button>
          </a-space>
        </div>
      </a-layout-content>
    </a-layout>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'

const router = useRouter()

const logout = () => {
  localStorage.removeItem('token')
  message.success('Logged out successfully')
  router.push('/login')
}
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 0 24px;
  display: flex;
  align-items: center;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header h1 {
  margin: 0;
  font-size: 20px;
}

.content {
  padding: 24px;
}

.welcome-box {
  background: white;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.welcome-box h2 {
  color: #333;
  margin-bottom: 16px;
}

.welcome-box p {
  color: #666;
  margin-bottom: 16px;
}
</style>
