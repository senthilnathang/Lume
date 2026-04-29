<template>
  <div class="login-container">
    <div class="login-card">
      <h1>Lume Admin</h1>
      <a-form
        :model="form"
        layout="vertical"
        @finish="onFinish"
        @finish-failed="onFinishFailed"
      >
        <a-form-item
          label="Email"
          name="email"
          :rules="[{ required: true, message: 'Please input your email!' }]"
        >
          <a-input v-model:value="form.email" placeholder="admin@lume.dev" />
        </a-form-item>

        <a-form-item
          label="Password"
          name="password"
          :rules="[{ required: true, message: 'Please input your password!' }]"
        >
          <a-input-password v-model:value="form.password" placeholder="••••••••" />
        </a-form-item>

        <a-form-item>
          <a-button type="primary" html-type="submit" class="w-full">
            Sign In
          </a-button>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import axios from 'axios'

const router = useRouter()
const form = ref({
  email: 'admin@lume.dev',
  password: 'admin123'
})

const onFinish = async () => {
  try {
    const response = await axios.post('/api/users/login', {
      email: form.value.email,
      password: form.value.password
    })

    localStorage.setItem('token', response.data.token)
    message.success('Login successful')
    router.push('/')
  } catch (error) {
    message.error('Login failed. Please check your credentials.')
    console.error(error)
  }
}

const onFinishFailed = () => {
  message.error('Please fill all required fields')
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.w-full {
  width: 100%;
}
</style>
