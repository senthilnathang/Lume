<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Progress,
  Row,
  Space,
  Spin,
  // Statistic,
  Switch,
  // Tooltip,
  Typography,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  MobileOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SecurityScanOutlined,
  SettingOutlined,
  WarningOutlined,
} from '@ant-design/icons-vue';

import {
  disable2FAApi,
  getSecurityOverviewApi,
  getSecuritySettingsApi,
  setup2FAApi,
  updateSecuritySettingsApi,
  verify2FAApi,
  type SecurityApi,
} from '#/api/security';

const { Title, Text, Paragraph } = Typography;

defineOptions({
  name: 'SecuritySettings',
});

// State
const loading = ref(false);
const saving = ref(false);
const settings = ref<SecurityApi.SecuritySetting | null>(null);
const overview = ref<SecurityApi.SecurityOverview | null>(null);

// 2FA State
const show2FAModal = ref(false);
const twoFactorSetup = ref<SecurityApi.TwoFactorSetup | null>(null);
const verificationCode = ref('');
const verifying2FA = ref(false);

// Disable 2FA State
const showDisable2FAModal = ref(false);
const disablePassword = ref('');
const disableToken = ref('');
const disabling2FA = ref(false);

// Form state for editing
const formState = ref<SecurityApi.SecuritySettingUpdate>({});

const securityScoreColor = computed(() => {
  if (!overview.value) return '#d9d9d9';
  const score = overview.value.security_score;
  if (score >= 80) return '#52c41a';
  if (score >= 60) return '#faad14';
  return '#ff4d4f';
});

const securityScoreStatus = computed(() => {
  if (!overview.value) return 'unknown';
  const score = overview.value.security_score;
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
});

async function fetchData() {
  loading.value = true;
  try {
    const [settingsResponse, overviewResponse] = await Promise.all([
      getSecuritySettingsApi(),
      getSecurityOverviewApi(),
    ]);
    settings.value = settingsResponse;
    overview.value = overviewResponse;

    // Initialize form state
    formState.value = {
      require_password_change: settingsResponse.require_password_change,
      password_expiry_days: settingsResponse.password_expiry_days,
      max_login_attempts: settingsResponse.max_login_attempts,
      lockout_duration_minutes: settingsResponse.lockout_duration_minutes,
      max_session_duration_hours: settingsResponse.max_session_duration_hours,
      allow_concurrent_sessions: settingsResponse.allow_concurrent_sessions,
      max_concurrent_sessions: settingsResponse.max_concurrent_sessions,
      email_on_login: settingsResponse.email_on_login,
      email_on_password_change: settingsResponse.email_on_password_change,
      email_on_security_change: settingsResponse.email_on_security_change,
      email_on_suspicious_activity: settingsResponse.email_on_suspicious_activity,
      activity_logging_enabled: settingsResponse.activity_logging_enabled,
      data_retention_days: settingsResponse.data_retention_days,
      api_access_enabled: settingsResponse.api_access_enabled,
      api_rate_limit: settingsResponse.api_rate_limit,
    };
  } catch (error) {
    console.error('Failed to fetch security data:', error);
    message.error('Failed to load security settings');
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  saving.value = true;
  try {
    const response = await updateSecuritySettingsApi(formState.value);
    settings.value = response;
    message.success('Security settings updated successfully');
  } catch (error) {
    console.error('Failed to save settings:', error);
    message.error('Failed to save security settings');
  } finally {
    saving.value = false;
  }
}

async function initiate2FASetup() {
  try {
    const response = await setup2FAApi();
    twoFactorSetup.value = response;
    verificationCode.value = '';
    show2FAModal.value = true;
  } catch (error: any) {
    console.error('Failed to setup 2FA:', error);
    message.error(error?.response?.data?.detail || 'Failed to setup 2FA');
  }
}

async function verify2FA() {
  if (!verificationCode.value || verificationCode.value.length !== 6) {
    message.warning('Please enter a 6-digit verification code');
    return;
  }

  verifying2FA.value = true;
  try {
    await verify2FAApi({ token: verificationCode.value });
    message.success('Two-factor authentication enabled successfully');
    show2FAModal.value = false;
    twoFactorSetup.value = null;
    verificationCode.value = '';
    fetchData();
  } catch (error: any) {
    console.error('Failed to verify 2FA:', error);
    message.error(error?.response?.data?.detail || 'Invalid verification code');
  } finally {
    verifying2FA.value = false;
  }
}

function openDisable2FAModal() {
  disablePassword.value = '';
  disableToken.value = '';
  showDisable2FAModal.value = true;
}

async function disable2FA() {
  if (!disablePassword.value) {
    message.warning('Please enter your password');
    return;
  }

  disabling2FA.value = true;
  try {
    await disable2FAApi({
      password: disablePassword.value,
      token: disableToken.value || undefined,
    });
    message.success('Two-factor authentication disabled');
    showDisable2FAModal.value = false;
    disablePassword.value = '';
    disableToken.value = '';
    fetchData();
  } catch (error: any) {
    console.error('Failed to disable 2FA:', error);
    message.error(error?.response?.data?.detail || 'Failed to disable 2FA');
  } finally {
    disabling2FA.value = false;
  }
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading">
      <Row :gutter="[24, 24]">
        <!-- Security Overview -->
        <Col :xs="24" :lg="8">
          <Card title="Security Overview">
            <template #extra>
              <Button size="small" @click="fetchData">
                <template #icon><ReloadOutlined /></template>
              </Button>
            </template>

            <div class="mb-6 text-center">
              <Progress
                type="circle"
                :percent="overview?.security_score || 0"
                :stroke-color="securityScoreColor"
                :size="120"
              />
              <div class="mt-2">
                <Text strong :style="{ color: securityScoreColor }">
                  {{ securityScoreStatus }}
                </Text>
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <Space>
                  <MobileOutlined />
                  <Text>Two-Factor Auth</Text>
                </Space>
                <span v-if="overview?.two_factor_enabled">
                  <CheckCircleOutlined class="text-green-500" />
                </span>
                <span v-else>
                  <CloseCircleOutlined class="text-red-500" />
                </span>
              </div>

              <div class="flex items-center justify-between">
                <Space>
                  <SecurityScanOutlined />
                  <Text>Active Sessions</Text>
                </Space>
                <Text>{{ overview?.active_sessions_count || 0 }}</Text>
              </div>

              <div class="flex items-center justify-between">
                <Space>
                  <WarningOutlined />
                  <Text>Failed Logins</Text>
                </Space>
                <Text>{{ overview?.recent_login_attempts || 0 }}</Text>
              </div>
            </div>

            <Divider />

            <div v-if="overview?.recommendations?.length">
              <Title :level="5">Recommendations</Title>
              <Alert
                v-for="(rec, index) in overview.recommendations"
                :key="index"
                type="warning"
                :message="rec"
                class="mb-2"
                show-icon
              />
            </div>
          </Card>
        </Col>

        <!-- Security Settings -->
        <Col :xs="24" :lg="16">
          <!-- Two-Factor Authentication -->
          <Card class="mb-6">
            <template #title>
              <Space>
                <SafetyCertificateOutlined />
                <span>Two-Factor Authentication</span>
              </Space>
            </template>

            <div class="flex items-center justify-between">
              <div>
                <Title :level="5" class="!mb-1">
                  {{ settings?.two_factor_enabled ? 'Enabled' : 'Disabled' }}
                </Title>
                <Paragraph class="!mb-0 text-gray-500">
                  Add an extra layer of security to your account by requiring a verification code in addition to your password.
                </Paragraph>
              </div>

              <Button
                v-if="!settings?.two_factor_enabled"
                type="primary"
                @click="initiate2FASetup"
              >
                <template #icon><LockOutlined /></template>
                Enable 2FA
              </Button>
              <Button
                v-else
                danger
                @click="openDisable2FAModal"
              >
                <template #icon><CloseCircleOutlined /></template>
                Disable 2FA
              </Button>
            </div>
          </Card>

          <!-- Login & Session Settings -->
          <Card class="mb-6">
            <template #title>
              <Space>
                <SettingOutlined />
                <span>Login & Session Settings</span>
              </Space>
            </template>

            <Form layout="vertical">
              <Row :gutter="16">
                <Col :xs="24" :sm="12">
                  <FormItem label="Max Login Attempts">
                    <InputNumber
                      v-model:value="formState.max_login_attempts"
                      :min="1"
                      :max="20"
                      style="width: 100%"
                    />
                  </FormItem>
                </Col>
                <Col :xs="24" :sm="12">
                  <FormItem label="Lockout Duration (minutes)">
                    <InputNumber
                      v-model:value="formState.lockout_duration_minutes"
                      :min="1"
                      :max="1440"
                      style="width: 100%"
                    />
                  </FormItem>
                </Col>
                <Col :xs="24" :sm="12">
                  <FormItem label="Session Duration (hours)">
                    <InputNumber
                      v-model:value="formState.max_session_duration_hours"
                      :min="1"
                      :max="720"
                      style="width: 100%"
                    />
                  </FormItem>
                </Col>
                <Col :xs="24" :sm="12">
                  <FormItem label="Max Concurrent Sessions">
                    <InputNumber
                      v-model:value="formState.max_concurrent_sessions"
                      :min="1"
                      :max="20"
                      :disabled="!formState.allow_concurrent_sessions"
                      style="width: 100%"
                    />
                  </FormItem>
                </Col>
                <Col :xs="24" :sm="12">
                  <FormItem label="Allow Concurrent Sessions">
                    <Switch v-model:checked="formState.allow_concurrent_sessions" />
                  </FormItem>
                </Col>
              </Row>
            </Form>
          </Card>

          <!-- Password Settings -->
          <Card class="mb-6">
            <template #title>
              <Space>
                <LockOutlined />
                <span>Password Settings</span>
              </Space>
            </template>

            <Form layout="vertical">
              <Row :gutter="16">
                <Col :xs="24" :sm="12">
                  <FormItem label="Password Expiry (days)">
                    <InputNumber
                      v-model:value="formState.password_expiry_days"
                      :min="0"
                      :max="365"
                      style="width: 100%"
                    />
                    <Text type="secondary" class="text-xs">
                      Set to 0 to disable password expiry
                    </Text>
                  </FormItem>
                </Col>
                <Col :xs="24" :sm="12">
                  <FormItem label="Require Password Change">
                    <Switch v-model:checked="formState.require_password_change" />
                  </FormItem>
                </Col>
              </Row>
            </Form>
          </Card>

          <!-- Email Notifications -->
          <Card class="mb-6">
            <template #title>
              <Space>
                <ExclamationCircleOutlined />
                <span>Security Notifications</span>
              </Space>
            </template>

            <Form layout="vertical">
              <Row :gutter="16">
                <Col :xs="24" :sm="12">
                  <FormItem>
                    <Space>
                      <Switch v-model:checked="formState.email_on_login" />
                      <Text>Email on new login</Text>
                    </Space>
                  </FormItem>
                </Col>
                <Col :xs="24" :sm="12">
                  <FormItem>
                    <Space>
                      <Switch v-model:checked="formState.email_on_password_change" />
                      <Text>Email on password change</Text>
                    </Space>
                  </FormItem>
                </Col>
                <Col :xs="24" :sm="12">
                  <FormItem>
                    <Space>
                      <Switch v-model:checked="formState.email_on_security_change" />
                      <Text>Email on security changes</Text>
                    </Space>
                  </FormItem>
                </Col>
                <Col :xs="24" :sm="12">
                  <FormItem>
                    <Space>
                      <Switch v-model:checked="formState.email_on_suspicious_activity" />
                      <Text>Email on suspicious activity</Text>
                    </Space>
                  </FormItem>
                </Col>
              </Row>
            </Form>
          </Card>

          <!-- API & Activity Settings -->
          <Card class="mb-6">
            <template #title>
              <Space>
                <SecurityScanOutlined />
                <span>API & Activity Settings</span>
              </Space>
            </template>

            <Form layout="vertical">
              <Row :gutter="16">
                <Col :xs="24" :sm="12">
                  <FormItem label="API Access Enabled">
                    <Switch v-model:checked="formState.api_access_enabled" />
                  </FormItem>
                </Col>
                <Col :xs="24" :sm="12">
                  <FormItem label="API Rate Limit (requests/hour)">
                    <InputNumber
                      v-model:value="formState.api_rate_limit"
                      :min="10"
                      :max="10000"
                      :disabled="!formState.api_access_enabled"
                      style="width: 100%"
                    />
                  </FormItem>
                </Col>
                <Col :xs="24" :sm="12">
                  <FormItem label="Activity Logging Enabled">
                    <Switch v-model:checked="formState.activity_logging_enabled" />
                  </FormItem>
                </Col>
                <Col :xs="24" :sm="12">
                  <FormItem label="Data Retention (days)">
                    <InputNumber
                      v-model:value="formState.data_retention_days"
                      :min="7"
                      :max="365"
                      style="width: 100%"
                    />
                  </FormItem>
                </Col>
              </Row>
            </Form>
          </Card>

          <!-- Save Button -->
          <div class="flex justify-end">
            <Button type="primary" :loading="saving" @click="saveSettings">
              Save Settings
            </Button>
          </div>
        </Col>
      </Row>
    </Spin>

    <!-- 2FA Setup Modal -->
    <Modal
      v-model:open="show2FAModal"
      title="Setup Two-Factor Authentication"
      :width="500"
      :footer="null"
      :closable="!verifying2FA"
      :maskClosable="false"
    >
      <div v-if="twoFactorSetup" class="text-center">
        <Paragraph>
          Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
        </Paragraph>

        <div class="my-4 flex justify-center">
          <img :src="twoFactorSetup.qr_code_url" alt="2FA QR Code" class="rounded-lg border p-2" />
        </div>

        <Paragraph type="secondary" class="text-xs">
          Or enter this code manually: <code>{{ twoFactorSetup.secret }}</code>
        </Paragraph>

        <Divider />

        <Alert type="warning" class="mb-4 text-left">
          <template #message>Backup Codes</template>
          <template #description>
            <Paragraph class="!mb-2">
              Save these backup codes in a safe place. You can use them to access your account if you lose your device.
            </Paragraph>
            <div class="grid grid-cols-2 gap-2">
              <code v-for="code in twoFactorSetup.backup_codes" :key="code" class="rounded bg-gray-100 p-1 text-center">
                {{ code }}
              </code>
            </div>
          </template>
        </Alert>

        <FormItem label="Enter the 6-digit code from your app">
          <Input
            v-model:value="verificationCode"
            placeholder="000000"
            :maxlength="6"
            class="text-center text-2xl tracking-widest"
            @press-enter="verify2FA"
          />
        </FormItem>

        <Space>
          <Button @click="show2FAModal = false" :disabled="verifying2FA">
            Cancel
          </Button>
          <Button type="primary" :loading="verifying2FA" @click="verify2FA">
            Verify & Enable
          </Button>
        </Space>
      </div>
    </Modal>

    <!-- Disable 2FA Modal -->
    <Modal
      v-model:open="showDisable2FAModal"
      title="Disable Two-Factor Authentication"
      :width="400"
      :footer="null"
      :closable="!disabling2FA"
      :maskClosable="false"
    >
      <Alert type="warning" class="mb-4">
        <template #message>Warning</template>
        <template #description>
          Disabling two-factor authentication will make your account less secure.
        </template>
      </Alert>

      <Form layout="vertical">
        <FormItem label="Password" required>
          <Input
            v-model:value="disablePassword"
            type="password"
            placeholder="Enter your password"
          />
        </FormItem>

        <FormItem label="Verification Code (optional)">
          <Input
            v-model:value="disableToken"
            placeholder="6-digit code or backup code"
          />
        </FormItem>
      </Form>

      <div class="flex justify-end gap-2">
        <Button @click="showDisable2FAModal = false" :disabled="disabling2FA">
          Cancel
        </Button>
        <Button type="primary" danger :loading="disabling2FA" @click="disable2FA">
          Disable 2FA
        </Button>
      </div>
    </Modal>
  </Page>
</template>

<style scoped>
.space-y-4 > * + * {
  margin-top: 1rem;
}
</style>
