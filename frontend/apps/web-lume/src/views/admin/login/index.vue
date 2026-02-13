<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { Alert, Form, Input, Button, Checkbox, Card, Typography } from 'ant-design-vue';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons-vue';
import { useAuthStore } from '@/store/auth';

const { Item: FormItem } = Form;
const { PasswordInput } = Input;
const { Title } = Typography;

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const errorMsg = ref('');

const formState = reactive({
  email: 'admin@gawdesy.org',
  password: 'admin123',
  remember: true
});

const rules = {
  email: [
    { required: true, message: 'Please enter your email', trigger: 'blur' },
    { type: 'email', message: 'Please enter a valid email', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Please enter your password', trigger: 'blur' },
    { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' }
  ]
};

const handleLogin = async () => {
  errorMsg.value = '';
  loading.value = true;
  
  try {
    const success = await authStore.login(formState.email, formState.password);
    if (success) {
      router.push('/admin');
    } else {
      errorMsg.value = 'Invalid email or password. Please try again.';
    }
  } catch (err: any) {
    console.error('Login error:', err);
    errorMsg.value = err.message || 'Login failed. Please check your credentials and try again.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <Card class="login-card" :bordered="false">
        <div class="login-header">
          <div class="logo-icon">
            <SafetyCertificateOutlined spin />
          </div>
          <Title :level="2" class="login-title">GAWDESY</Title>
          <Title :level="5" type="secondary" class="login-subtitle">Admin Dashboard</Title>
        </div>

        <Form 
          :model="formState" 
          :rules="rules" 
          @finish="handleLogin"
          @submit.prevent
          layout="vertical"
          class="login-form"
        >
          <FormItem name="email">
            <Input
              v-model:value="formState.email"
              type="email"
              size="large"
              placeholder="Email address"
              autocomplete="email"
              name="email"
            >
              <template #prefix>
                <UserOutlined class="input-icon" />
              </template>
            </Input>
          </FormItem>

          <FormItem name="password">
            <Input.Password
              v-model:value="formState.password"
              size="large"
              placeholder="Password"
              autocomplete="current-password"
            >
              <template #prefix>
                <LockOutlined class="input-icon" />
              </template>
            </Input.Password>
          </FormItem>

          <div class="form-options">
            <FormItem name="remember">
              <Checkbox v-model:checked="formState.remember">Remember me</Checkbox>
            </FormItem>
            <a href="#" class="forgot-link">Forgot password?</a>
          </div>

          <Alert 
            v-if="errorMsg" 
            type="error" 
            :message="errorMsg" 
            show-icon 
            closable
            class="error-alert"
          />

          <FormItem>
            <Button 
              type="primary" 
              html-type="submit" 
              :loading="loading" 
              size="large"
              block
              class="login-btn"
            >
              Sign In
            </Button>
          </FormItem>
        </Form>

        <div class="login-footer">
          <router-link to="/" class="back-link">
            ← Back to Website
          </router-link>
        </div>
      </Card>

      <div class="login-info">
        <p>Demo Credentials:</p>
        <code>admin@gawdesy.org / admin123</code>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-container {
  width: 100%;
  max-width: 420px;
}

.login-card {
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  font-size: 48px;
  color: #2E7D32;
  margin-bottom: 16px;
}

.login-title {
  margin: 0;
  color: #2E7D32;
  font-weight: 700;
}

.login-subtitle {
  margin: 8px 0 0 0;
  color: #8c8c8c;
}

.login-form {
  margin-top: 24px;
}

.input-icon {
  color: #bfbfbf;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.forgot-link {
  color: #2E7D32;
  font-size: 14px;
}

.forgot-link:hover {
  color: #1B5E20;
}

.error-alert {
  margin-bottom: 16px;
}

.login-btn {
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: #2E7D32;
  border-color: #2E7D32;
}

.login-btn:hover {
  background: #1B5E20;
  border-color: #1B5E20;
}

.login-footer {
  margin-top: 24px;
  text-align: center;
}

.back-link {
  color: #8c8c8c;
  font-size: 14px;
}

.back-link:hover {
  color: #2E7D32;
}

.login-info {
  margin-top: 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
}

.login-info code {
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 12px;
  border-radius: 4px;
  font-family: monospace;
}
</style>
