<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  List,
  message,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Timeline,
  Upload,
} from 'ant-design-vue';
import {
  CameraOutlined,
  DeleteOutlined,
  DesktopOutlined,
  HomeOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons-vue';

import { requestClient } from '#/api/request';

defineOptions({
  name: 'ProfilePage',
});

const userStore = useUserStore();
const userName = computed(() => userStore.userInfo?.realName || userStore.userInfo?.username || 'User');
const userAvatar = computed(() => userStore.userInfo?.avatar || preferences.app.defaultAvatar);
const userRoles = computed(() => userStore.userInfo?.roles || []);

const loading = ref(false);
const editMode = ref(false);
const savingPreferences = ref(false);

// User profile data from API
const profileData = ref({
  id: 0,
  fullName: '',
  email: '',
  username: '',
  phone: '',
  bio: '',
  location: '',
  website: '',
  timezone: 'UTC',
  language: 'en',
  defaultHomePath: '',
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

// Security state
const loadingSecurity = ref(false);
const securitySettings = ref<any>(null);
const securityScore = ref<any>(null);
const activeSessions = ref<any[]>([]);
const securityActivity = ref<any[]>([]);
const show2FASetupModal = ref(false);
const twoFactorSetup = ref<any>(null);
const verificationCode = ref('');
const verifying2FA = ref(false);
const showDisable2FAModal = ref(false);
const disablePassword = ref('');
const disabling2FA = ref(false);

// Available menu options for home path (populated from user's accessible menus)
const menuOptions = ref<{ value: string; label: string }[]>([]);

// Fetch user profile from API
async function fetchUserProfile() {
  try {
    const response = await requestClient.get<any>('/users/me');
    profileData.value = {
      id: response.id,
      fullName: response.full_name || '',
      email: response.email || '',
      username: response.username || '',
      phone: response.phone || '',
      bio: response.bio || '',
      location: response.location || '',
      website: response.website || '',
      timezone: response.timezone || 'UTC',
      language: response.language || 'en',
      defaultHomePath: response.default_home_path || '',
    };
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    message.error('Failed to load profile');
  }
}

// Fetch security data
async function fetchSecurityData() {
  loadingSecurity.value = true;
  try {
    const [settingsRes, scoreRes, sessionsRes, activityRes] = await Promise.all([
      requestClient.get<any>('/user-security/me/settings'),
      requestClient.get<any>('/user-security/me/score'),
      requestClient.get<any>('/user-security/me/sessions'),
      requestClient.get<any>('/user-security/me/activity', { params: { page: 1, page_size: 10 } }),
    ]);

    securitySettings.value = settingsRes;
    securityScore.value = scoreRes;
    activeSessions.value = sessionsRes || [];
    securityActivity.value = activityRes?.items || [];
  } catch (error) {
    console.error('Failed to fetch security data:', error);
    // Don't show error - security features might not be available
  } finally {
    loadingSecurity.value = false;
  }
}

// 2FA Setup
async function initiate2FASetup() {
  try {
    const response = await requestClient.post<any>('/auth/2fa/setup');
    twoFactorSetup.value = response;
    verificationCode.value = '';
    show2FASetupModal.value = true;
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
    await requestClient.post('/auth/2fa/verify', { code: verificationCode.value });
    message.success('Two-factor authentication enabled successfully');
    show2FASetupModal.value = false;
    twoFactorSetup.value = null;
    verificationCode.value = '';
    fetchSecurityData();
  } catch (error: any) {
    console.error('Failed to verify 2FA:', error);
    message.error(error?.response?.data?.detail || 'Invalid verification code');
  } finally {
    verifying2FA.value = false;
  }
}

async function disable2FA() {
  if (!disablePassword.value) {
    message.warning('Please enter your password');
    return;
  }

  disabling2FA.value = true;
  try {
    await requestClient.post('/auth/2fa/disable', { password: disablePassword.value });
    message.success('Two-factor authentication disabled');
    showDisable2FAModal.value = false;
    disablePassword.value = '';
    fetchSecurityData();
  } catch (error: any) {
    console.error('Failed to disable 2FA:', error);
    message.error(error?.response?.data?.detail || 'Failed to disable 2FA');
  } finally {
    disabling2FA.value = false;
  }
}

// Session management
async function terminateSession(sessionId: string) {
  try {
    await requestClient.delete(`/user-security/me/sessions/${sessionId}`);
    message.success('Session terminated');
    fetchSecurityData();
  } catch (error: any) {
    console.error('Failed to terminate session:', error);
    message.error(error?.response?.data?.detail || 'Failed to terminate session');
  }
}

async function terminateAllOtherSessions() {
  try {
    await requestClient.delete('/user-security/me/sessions');
    message.success('All other sessions terminated');
    fetchSecurityData();
  } catch (error: any) {
    console.error('Failed to terminate sessions:', error);
    message.error(error?.response?.data?.detail || 'Failed to terminate sessions');
  }
}

// Helper functions
function getScoreColor(score: number) {
  if (score >= 80) return '#52c41a';
  if (score >= 60) return '#1890ff';
  if (score >= 40) return '#faad14';
  return '#ff4d4f';
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

// Build menu options from accessible routes
function buildMenuOptions() {
  const options: { value: string; label: string }[] = [
    { value: '', label: 'Use system default (Inbox)' },
  ];

  // Core menu items (always available)
  // Module-specific items are loaded dynamically from backend
  const commonMenus = [
    { path: '/inbox', label: 'Inbox' },
    { path: '/settings/invitations', label: 'Invitations' },
    { path: '/settings/users', label: 'Users' },
    { path: '/settings/companies', label: 'Companies' },
    { path: '/profile', label: 'Profile' },
  ];

  // Add common menus
  commonMenus.forEach((menu) => {
    options.push({ value: menu.path, label: menu.label });
  });

  menuOptions.value = options;
}

// Save profile changes
async function handleSaveProfile() {
  loading.value = true;
  try {
    await requestClient.patch('/users/me', {
      full_name: profileData.value.fullName,
      phone: profileData.value.phone,
      bio: profileData.value.bio,
      location: profileData.value.location,
      website: profileData.value.website,
      timezone: profileData.value.timezone,
      language: profileData.value.language,
    });
    editMode.value = false;
    message.success('Profile updated successfully!');

    // Update user store
    if (userStore.userInfo) {
      userStore.setUserInfo({
        ...userStore.userInfo,
        realName: profileData.value.fullName,
      });
    }
  } catch (error: any) {
    console.error('Failed to update profile:', error);
    message.error(error?.response?.data?.detail || 'Failed to update profile');
  } finally {
    loading.value = false;
  }
}

// Save home path preference
async function handleSaveHomePath() {
  savingPreferences.value = true;
  try {
    await requestClient.patch('/users/me', {
      default_home_path: profileData.value.defaultHomePath || null,
    });
    message.success('Home page preference saved!');

    // Update user store home path
    if (userStore.userInfo) {
      userStore.setUserInfo({
        ...userStore.userInfo,
        homePath: profileData.value.defaultHomePath || preferences.app.defaultHomePath,
      });
    }
  } catch (error: any) {
    console.error('Failed to save preference:', error);
    message.error(error?.response?.data?.detail || 'Failed to save preference');
  } finally {
    savingPreferences.value = false;
  }
}

const handleChangePassword = async () => {
  // Validate passwords match
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    message.error('Passwords do not match!');
    return;
  }

  // Validate password strength
  const pwd = passwordForm.value.newPassword;
  if (pwd.length < 8) {
    message.error('Password must be at least 8 characters');
    return;
  }
  if (!/[A-Z]/.test(pwd)) {
    message.error('Password must contain at least one uppercase letter');
    return;
  }
  if (!/[a-z]/.test(pwd)) {
    message.error('Password must contain at least one lowercase letter');
    return;
  }
  if (!/\d/.test(pwd)) {
    message.error('Password must contain at least one digit');
    return;
  }

  loading.value = true;
  try {
    await requestClient.post('/auth/change-password', {
      current_password: passwordForm.value.currentPassword,
      new_password: passwordForm.value.newPassword,
    });

    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
    message.success('Password changed successfully!');
  } catch (error: any) {
    console.error('Failed to change password:', error);
    const errorMessage = error?.response?.data?.detail || 'Failed to change password';
    message.error(errorMessage);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchUserProfile();
  buildMenuOptions();
  fetchSecurityData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <h1 class="mb-6 text-2xl font-bold">My Profile</h1>

      <Row :gutter="[16, 16]">
        <Col :xs="24" :lg="8">
          <Card>
            <div class="text-center">
              <div class="relative mb-4 inline-block">
                <Avatar :size="100" :src="userAvatar">
                  {{ userName?.charAt(0) || 'U' }}
                </Avatar>
                <Upload :show-upload-list="false" class="absolute bottom-0 right-0">
                  <Button shape="circle" size="small">
                    <template #icon>
                      <CameraOutlined />
                    </template>
                  </Button>
                </Upload>
              </div>
              <h2 class="mb-1 text-xl font-bold">{{ userName }}</h2>
              <p class="text-gray-500">{{ profileData.email }}</p>
              <div class="mt-2">
                <Tag v-for="role in userRoles" :key="role" color="blue">
                  {{ role }}
                </Tag>
              </div>
              <div class="mt-4">
                <Tag color="green">Active</Tag>
              </div>
            </div>

            <div class="mt-6 border-t pt-4">
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-gray-500">User ID</span>
                  <span class="font-medium">{{ profileData.id }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Username</span>
                  <span class="font-medium">{{ profileData.username }}</span>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col :xs="24" :lg="16">
          <Card>
            <Tabs>
              <Tabs.TabPane key="info" tab="Personal Information">
                <template v-if="!editMode">
                  <Descriptions :column="2" bordered>
                    <Descriptions.Item label="Full Name">
                      {{ profileData.fullName || '-' }}
                    </Descriptions.Item>
                    <Descriptions.Item label="Email">
                      {{ profileData.email }}
                    </Descriptions.Item>
                    <Descriptions.Item label="Phone">
                      {{ profileData.phone || '-' }}
                    </Descriptions.Item>
                    <Descriptions.Item label="Location">
                      {{ profileData.location || '-' }}
                    </Descriptions.Item>
                    <Descriptions.Item label="Website">
                      {{ profileData.website || '-' }}
                    </Descriptions.Item>
                    <Descriptions.Item label="Timezone">
                      {{ profileData.timezone }}
                    </Descriptions.Item>
                    <Descriptions.Item label="Bio" :span="2">
                      {{ profileData.bio || '-' }}
                    </Descriptions.Item>
                  </Descriptions>
                  <div class="mt-4">
                    <Button type="primary" @click="editMode = true">
                      Edit Profile
                    </Button>
                  </div>
                </template>

                <template v-else>
                  <Form layout="vertical">
                    <Row :gutter="16">
                      <Col :span="12">
                        <Form.Item label="Full Name">
                          <Input v-model:value="profileData.fullName" />
                        </Form.Item>
                      </Col>
                      <Col :span="12">
                        <Form.Item label="Phone">
                          <Input v-model:value="profileData.phone" />
                        </Form.Item>
                      </Col>
                      <Col :span="12">
                        <Form.Item label="Location">
                          <Input v-model:value="profileData.location" />
                        </Form.Item>
                      </Col>
                      <Col :span="12">
                        <Form.Item label="Website">
                          <Input v-model:value="profileData.website" />
                        </Form.Item>
                      </Col>
                      <Col :span="12">
                        <Form.Item label="Timezone">
                          <Select v-model:value="profileData.timezone">
                            <Select.Option value="UTC">UTC</Select.Option>
                            <Select.Option value="America/New_York">Eastern Time</Select.Option>
                            <Select.Option value="America/Los_Angeles">Pacific Time</Select.Option>
                            <Select.Option value="Europe/London">London</Select.Option>
                            <Select.Option value="Asia/Tokyo">Tokyo</Select.Option>
                            <Select.Option value="Asia/Kolkata">India</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col :span="24">
                        <Form.Item label="Bio">
                          <Input.TextArea v-model:value="profileData.bio" :rows="3" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <div class="flex gap-2">
                      <Button type="primary" :loading="loading" @click="handleSaveProfile">
                        Save Changes
                      </Button>
                      <Button @click="editMode = false">Cancel</Button>
                    </div>
                  </Form>
                </template>
              </Tabs.TabPane>

              <Tabs.TabPane key="preferences" tab="Preferences">
                <h3 class="mb-4 text-lg font-medium">
                  <HomeOutlined class="mr-2" />
                  Default Home Page
                </h3>
                <p class="mb-4 text-gray-500">
                  Choose which page to show after you log in. Leave empty to use the system default.
                </p>

                <Form layout="vertical" style="max-width: 500px">
                  <Form.Item label="Default Landing Page">
                    <Select
                      v-model:value="profileData.defaultHomePath"
                      placeholder="Select your preferred home page"
                      :options="menuOptions"
                      allow-clear
                      show-search
                      :filter-option="(input: string, option: any) =>
                        option.label.toLowerCase().includes(input.toLowerCase())
                      "
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="primary"
                      :loading="savingPreferences"
                      @click="handleSaveHomePath"
                    >
                      Save Preference
                    </Button>
                  </Form.Item>
                </Form>

                <div class="mt-6 rounded border border-blue-200 bg-blue-50 p-4">
                  <p class="text-sm text-blue-700">
                    <strong>Current setting:</strong>
                    {{ profileData.defaultHomePath || 'System default (Dashboard)' }}
                  </p>
                </div>
              </Tabs.TabPane>

              <Tabs.TabPane key="security" tab="Security">
                <Spin :spinning="loadingSecurity">
                  <Row :gutter="[16, 16]">
                    <!-- Security Score -->
                    <Col :xs="24" :md="8">
                      <Card size="small">
                        <div class="text-center">
                          <Progress
                            type="circle"
                            :percent="securityScore?.overall_score || 0"
                            :stroke-color="getScoreColor(securityScore?.overall_score || 0)"
                            :size="80"
                          />
                          <div class="mt-2 font-medium">Security Score</div>
                          <div v-if="securityScore?.recommendations?.length" class="mt-2">
                            <Tag
                              v-for="rec in securityScore.recommendations.slice(0, 2)"
                              :key="rec"
                              color="orange"
                              class="mb-1"
                            >
                              {{ rec }}
                            </Tag>
                          </div>
                        </div>
                      </Card>
                    </Col>

                    <!-- 2FA Status -->
                    <Col :xs="24" :md="16">
                      <Card size="small" title="Two-Factor Authentication">
                        <template #extra>
                          <Tag v-if="securitySettings?.two_factor_required" color="blue">Required</Tag>
                        </template>
                        <div class="flex items-center justify-between">
                          <div>
                            <div class="flex items-center gap-2">
                              <SafetyCertificateOutlined
                                :style="{ color: userStore.userInfo?.twoFactorEnabled ? '#52c41a' : '#ff4d4f', fontSize: '24px' }"
                              />
                              <span class="font-medium">
                                {{ userStore.userInfo?.twoFactorEnabled ? 'Enabled' : 'Disabled' }}
                              </span>
                            </div>
                            <p class="text-gray-500 text-sm mt-1">
                              Add an extra layer of security to your account
                            </p>
                          </div>
                          <Button
                            v-if="!userStore.userInfo?.twoFactorEnabled"
                            type="primary"
                            @click="initiate2FASetup"
                          >
                            <template #icon><LockOutlined /></template>
                            Enable 2FA
                          </Button>
                          <Button
                            v-else
                            danger
                            @click="showDisable2FAModal = true"
                          >
                            Disable 2FA
                          </Button>
                        </div>
                      </Card>
                    </Col>

                    <!-- Active Sessions -->
                    <Col :span="24">
                      <Card size="small" title="Active Sessions">
                        <template #extra>
                          <Button
                            v-if="activeSessions.length > 1"
                            size="small"
                            danger
                            @click="terminateAllOtherSessions"
                          >
                            Terminate All Others
                          </Button>
                        </template>
                        <List
                          :data-source="activeSessions"
                          size="small"
                          :locale="{ emptyText: 'No active sessions found' }"
                        >
                          <template #renderItem="{ item }">
                            <List.Item>
                              <List.Item.Meta
                                :description="`${item.ipAddress || 'Unknown IP'} - Last active: ${formatDateTime(item.lastActivityAt)}`"
                              >
                                <template #title>
                                  <Space>
                                    <DesktopOutlined />
                                    <span>{{ item.deviceName || 'Unknown Device' }}</span>
                                    <Tag v-if="item.isCurrent" color="green">Current</Tag>
                                  </Space>
                                </template>
                              </List.Item.Meta>
                              <template #actions>
                                <Button
                                  v-if="!item.isCurrent"
                                  size="small"
                                  danger
                                  @click="terminateSession(item.sessionId)"
                                >
                                  <template #icon><DeleteOutlined /></template>
                                </Button>
                              </template>
                            </List.Item>
                          </template>
                        </List>
                      </Card>
                    </Col>

                    <!-- Change Password -->
                    <Col :span="24">
                      <Card size="small" title="Change Password">
                        <Form layout="vertical" style="max-width: 400px">
                          <Form.Item label="Current Password">
                            <Input.Password v-model:value="passwordForm.currentPassword" />
                          </Form.Item>
                          <Form.Item label="New Password">
                            <Input.Password v-model:value="passwordForm.newPassword" />
                          </Form.Item>
                          <Form.Item label="Confirm New Password">
                            <Input.Password v-model:value="passwordForm.confirmPassword" />
                          </Form.Item>
                          <Form.Item>
                            <Button type="primary" :loading="loading" @click="handleChangePassword">
                              Change Password
                            </Button>
                          </Form.Item>
                        </Form>
                      </Card>
                    </Col>

                    <!-- Recent Security Activity -->
                    <Col :span="24">
                      <Card size="small" title="Recent Security Activity">
                        <Timeline>
                          <Timeline.Item
                            v-for="event in securityActivity"
                            :key="event.id"
                            :color="event.action === 'LOGIN_FAILED' ? 'red' : 'green'"
                          >
                            <div class="flex justify-between">
                              <span>{{ event.description }}</span>
                              <span class="text-gray-500 text-xs">{{ formatDateTime(event.createdAt) }}</span>
                            </div>
                            <div v-if="event.ipAddress" class="text-gray-500 text-xs">
                              IP: {{ event.ipAddress }}
                            </div>
                          </Timeline.Item>
                        </Timeline>
                        <div v-if="!securityActivity.length" class="text-gray-500 text-center py-4">
                          No recent security activity
                        </div>
                      </Card>
                    </Col>
                  </Row>
                </Spin>
              </Tabs.TabPane>

              <Tabs.TabPane key="activity" tab="Activity Log">
                <Timeline>
                  <Timeline.Item
                    v-for="event in securityActivity"
                    :key="event.id"
                    :color="event.action === 'LOGIN_FAILED' ? 'red' : 'blue'"
                  >
                    <div class="flex justify-between">
                      <span>{{ event.description }}</span>
                      <span class="text-gray-500 text-xs">{{ formatDateTime(event.createdAt) }}</span>
                    </div>
                    <div v-if="event.ipAddress" class="text-gray-500 text-xs">
                      IP: {{ event.ipAddress }}
                    </div>
                  </Timeline.Item>
                </Timeline>
                <div v-if="!securityActivity.length" class="text-gray-500 text-center py-8">
                  <p>No recent activity to display.</p>
                </div>
              </Tabs.TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>

      <!-- 2FA Setup Modal -->
      <Modal
        v-model:open="show2FASetupModal"
        title="Setup Two-Factor Authentication"
        :width="500"
        :footer="null"
        :closable="!verifying2FA"
        :maskClosable="false"
      >
        <div v-if="twoFactorSetup" class="text-center">
          <p class="mb-4">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>

          <div class="my-4 flex justify-center">
            <img :src="twoFactorSetup.qr_code" alt="2FA QR Code" class="rounded-lg border p-2" />
          </div>

          <p class="text-gray-500 text-xs mb-4">
            Or enter this code manually: <code class="bg-gray-100 px-2 py-1 rounded">{{ twoFactorSetup.secret }}</code>
          </p>

          <Divider />

          <Alert type="warning" class="mb-4 text-left">
            <template #message>Backup Codes</template>
            <template #description>
              <p class="mb-2">
                Save these backup codes in a safe place. You can use them if you lose your device.
              </p>
              <div class="grid grid-cols-2 gap-2">
                <code v-for="code in twoFactorSetup.backup_codes" :key="code" class="rounded bg-gray-100 p-1 text-center">
                  {{ code }}
                </code>
              </div>
            </template>
          </Alert>

          <Form.Item label="Enter the 6-digit code from your app">
            <Input
              v-model:value="verificationCode"
              placeholder="000000"
              :maxlength="6"
              class="text-center text-2xl tracking-widest"
              @press-enter="verify2FA"
            />
          </Form.Item>

          <Space>
            <Button @click="show2FASetupModal = false" :disabled="verifying2FA">
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
          <Form.Item label="Password" required>
            <Input.Password
              v-model:value="disablePassword"
              placeholder="Enter your password to confirm"
            />
          </Form.Item>
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
    </div>
  </Page>
</template>
