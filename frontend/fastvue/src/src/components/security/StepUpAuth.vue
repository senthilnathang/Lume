<script setup lang="ts">
/**
 * Step-Up Authentication Modal
 *
 * Prompts user for additional authentication when
 * required by Zero Trust policies.
 */
import { ref, computed } from 'vue';
import { Modal, Input, Button, Alert, Space, Typography } from 'ant-design-vue';
import {
  LockOutlined,
  MobileOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons-vue';

import { useTrustStore } from '#/store/trust';

const { Text, Title } = Typography;

const props = defineProps<{
  visible: boolean;
  reason?: string;
  method?: string;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'cancel'): void;
}>();

const trustStore = useTrustStore();

// State
const code = ref('');
const isLoading = ref(false);
const error = ref<string | null>(null);

// Computed
const methodLabel = computed(() => {
  switch (props.method) {
    case 'mfa':
    case 'totp':
      return 'Authenticator App';
    case 'sms':
      return 'SMS Code';
    case 'email':
      return 'Email Code';
    case 'password':
      return 'Password';
    default:
      return 'Verification Code';
  }
});

const methodIcon = computed(() => {
  switch (props.method) {
    case 'mfa':
    case 'totp':
      return MobileOutlined;
    case 'sms':
      return MobileOutlined;
    case 'email':
      return KeyOutlined;
    case 'password':
      return LockOutlined;
    default:
      return SafetyCertificateOutlined;
  }
});

const isPassword = computed(() => props.method === 'password');

// Methods
async function handleSubmit() {
  if (!code.value) {
    error.value = 'Please enter the verification code';
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const success = await trustStore.completeStepUp(
      code.value,
      props.method || 'mfa',
    );

    if (success) {
      code.value = '';
      emit('success');
    } else {
      error.value = 'Invalid verification code. Please try again.';
    }
  } catch (err) {
    error.value = 'Authentication failed. Please try again.';
  } finally {
    isLoading.value = false;
  }
}

function handleCancel() {
  code.value = '';
  error.value = null;
  emit('cancel');
}
</script>

<template>
  <Modal
    :open="visible"
    :closable="false"
    :maskClosable="false"
    :footer="null"
    width="400px"
    centered
  >
    <div class="step-up-container">
      <!-- Header -->
      <div class="step-up-header">
        <div class="step-up-icon">
          <component :is="methodIcon" class="icon" />
        </div>
        <Title :level="4" class="step-up-title">
          Additional Verification Required
        </Title>
        <Text type="secondary" class="step-up-reason">
          {{ reason || 'This action requires additional authentication' }}
        </Text>
      </div>

      <!-- Error Alert -->
      <Alert
        v-if="error"
        type="error"
        :message="error"
        show-icon
        class="step-up-error"
        closable
        @close="error = null"
      />

      <!-- Input -->
      <div class="step-up-input">
        <Text class="input-label">Enter your {{ methodLabel }}</Text>
        <Input
          v-model:value="code"
          :type="isPassword ? 'password' : 'text'"
          :placeholder="isPassword ? 'Enter password' : 'Enter 6-digit code'"
          :maxlength="isPassword ? 100 : 6"
          size="large"
          @pressEnter="handleSubmit"
        >
          <template #prefix>
            <component :is="methodIcon" />
          </template>
        </Input>
      </div>

      <!-- Actions -->
      <Space direction="vertical" :size="12" class="step-up-actions">
        <Button
          type="primary"
          size="large"
          block
          :loading="isLoading"
          :disabled="!code"
          @click="handleSubmit"
        >
          Verify
        </Button>
        <Button size="large" block @click="handleCancel"> Cancel </Button>
      </Space>

      <!-- Help Text -->
      <div class="step-up-help">
        <Text type="secondary">
          <template v-if="method === 'mfa' || method === 'totp'">
            Open your authenticator app and enter the 6-digit code.
          </template>
          <template v-else-if="method === 'sms'">
            A code has been sent to your registered phone number.
          </template>
          <template v-else-if="method === 'email'">
            A code has been sent to your registered email address.
          </template>
          <template v-else>
            Enter your verification code to continue.
          </template>
        </Text>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.step-up-container {
  padding: 16px;
}

.step-up-header {
  text-align: center;
  margin-bottom: 24px;
}

.step-up-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-up-icon .icon {
  font-size: 32px;
  color: white;
}

.step-up-title {
  margin-bottom: 8px !important;
}

.step-up-reason {
  display: block;
}

.step-up-error {
  margin-bottom: 16px;
}

.step-up-input {
  margin-bottom: 24px;
}

.input-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.step-up-actions {
  width: 100%;
}

.step-up-help {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
}
</style>
