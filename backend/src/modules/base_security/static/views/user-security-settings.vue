<template>
  <div class="user-security-settings">
    <PageHeader
      title="User Security Settings"
      :sub-title="selectedUser ? `Editing: ${selectedUser.username}` : 'Select a user to manage security settings'"
      @back="handleBack"
    >
      <template #extra>
        <Space>
          <Button @click="fetchComplianceReport">
            <template #icon><BarChartOutlined /></template>
            Compliance Report
          </Button>
          <Button type="primary" @click="showBulkActionsModal = true">
            <template #icon><TeamOutlined /></template>
            Bulk Actions
          </Button>
        </Space>
      </template>
    </PageHeader>

    <Row :gutter="[16, 16]">
      <!-- User Search Panel -->
      <Col :xs="24" :lg="8">
        <Card title="Select User" :loading="loadingUsers">
          <Input
            v-model:value="searchQuery"
            placeholder="Search users..."
            allow-clear
            @change="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </Input>

          <List
            class="mt-4 user-list"
            :data-source="filteredUsers"
            :loading="loadingUsers"
            size="small"
          >
            <template #renderItem="{ item }">
              <ListItem
                :class="{ 'selected-user': selectedUser?.id === item.id }"
                @click="selectUser(item)"
              >
                <AListItemMeta :title="item.full_name || item.username" :description="item.email">
                  <template #avatar>
                    <Avatar :src="item.avatar_url">
                      {{ (item.full_name || item.username || 'U').charAt(0) }}
                    </Avatar>
                  </template>
                </AListItemMeta>
                <template #actions>
                  <Tag v-if="item.two_factor_enabled" color="green">2FA</Tag>
                  <Tag v-if="item.security_locked" color="red">Locked</Tag>
                </template>
              </ListItem>
            </template>
          </List>
        </Card>
      </Col>

      <!-- Security Settings Panel -->
      <Col :xs="24" :lg="16">
        <template v-if="selectedUser">
          <Spin :spinning="loadingSettings">
            <!-- Security Score Card -->
            <Card class="mb-4">
              <Row :gutter="16" align="middle">
                <Col :span="8">
                  <div class="text-center">
                    <Progress
                      type="circle"
                      :percent="securityScore?.overall_score || 0"
                      :stroke-color="getScoreColor(securityScore?.overall_score)"
                      :size="100"
                    />
                    <div class="mt-2 font-medium">Security Score</div>
                  </div>
                </Col>
                <Col :span="16">
                  <Descriptions :column="2" size="small">
                    <DescriptionsItem label="2FA Score">
                      <Progress
                        :percent="securityScore?.two_factor_score || 0"
                        :stroke-color="getScoreColor(securityScore?.two_factor_score)"
                        :show-info="false"
                        size="small"
                      />
                    </DescriptionsItem>
                    <DescriptionsItem label="Password Score">
                      <Progress
                        :percent="securityScore?.password_score || 0"
                        :stroke-color="getScoreColor(securityScore?.password_score)"
                        :show-info="false"
                        size="small"
                      />
                    </DescriptionsItem>
                    <DescriptionsItem label="Session Score">
                      <Progress
                        :percent="securityScore?.session_score || 0"
                        :stroke-color="getScoreColor(securityScore?.session_score)"
                        :show-info="false"
                        size="small"
                      />
                    </DescriptionsItem>
                    <DescriptionsItem label="Activity Score">
                      <Progress
                        :percent="securityScore?.activity_score || 0"
                        :stroke-color="getScoreColor(securityScore?.activity_score)"
                        :show-info="false"
                        size="small"
                      />
                    </DescriptionsItem>
                  </Descriptions>
                  <div v-if="securityScore?.risk_factors?.length" class="mt-2">
                    <Tag v-for="factor in securityScore.risk_factors" :key="factor" color="orange">
                      {{ factor }}
                    </Tag>
                  </div>
                </Col>
              </Row>
            </Card>

            <!-- Quick Actions -->
            <Card title="Quick Actions" class="mb-4">
              <Space wrap>
                <Button
                  v-if="!settings?.admin_locked"
                  danger
                  @click="showLockModal = true"
                >
                  <template #icon><LockOutlined /></template>
                  Lock Account
                </Button>
                <Button
                  v-else
                  type="primary"
                  @click="handleUnlockAccount"
                  :loading="actionLoading"
                >
                  <template #icon><UnlockOutlined /></template>
                  Unlock Account
                </Button>

                <Button @click="handleForce2FA" :loading="actionLoading">
                  <template #icon><SafetyOutlined /></template>
                  Force 2FA
                </Button>

                <Button
                  v-if="selectedUser.two_factor_enabled"
                  @click="showReset2FAModal = true"
                >
                  <template #icon><ReloadOutlined /></template>
                  Reset 2FA
                </Button>

                <Button danger @click="handleTerminateSessions" :loading="actionLoading">
                  <template #icon><DisconnectOutlined /></template>
                  Terminate Sessions
                </Button>
              </Space>
            </Card>

            <!-- Settings Tabs -->
            <Card>
              <Tabs v-model:activeKey="activeTab">
                <!-- Two-Factor Authentication -->
                <TabPane key="2fa" tab="Two-Factor Auth">
                  <Form layout="vertical">
                    <FormItem label="2FA Required">
                      <Switch
                        v-model:checked="formState.two_factor_required"
                        :disabled="settings?.settings_locked"
                      />
                      <div class="text-gray-500 text-sm mt-1">
                        When enabled, user must set up 2FA on next login
                      </div>
                    </FormItem>

                    <FormItem label="Allowed 2FA Methods">
                      <CheckboxGroup
                        v-model:value="formState.two_factor_methods"
                        :disabled="settings?.settings_locked"
                      >
                        <Checkbox value="totp">Authenticator App</Checkbox>
                        <Checkbox value="sms">SMS</Checkbox>
                        <Checkbox value="email">Email</Checkbox>
                      </CheckboxGroup>
                    </FormItem>

                    <Alert
                      v-if="selectedUser.two_factor_enabled"
                      type="success"
                      message="2FA is currently enabled for this user"
                      show-icon
                      class="mb-4"
                    />
                    <Alert
                      v-else-if="formState.two_factor_required"
                      type="warning"
                      message="2FA is required but not yet set up by user"
                      show-icon
                      class="mb-4"
                    />
                  </Form>
                </TabPane>

                <!-- API & Rate Limiting -->
                <TabPane key="api" tab="API Access">
                  <Form layout="vertical">
                    <Row :gutter="16">
                      <Col :span="12">
                        <FormItem label="API Access Enabled">
                          <Switch
                            v-model:checked="formState.api_access_enabled"
                            :disabled="settings?.settings_locked"
                          />
                        </FormItem>
                      </Col>
                      <Col :span="12">
                        <FormItem label="Personal API Key Enabled">
                          <Switch
                            v-model:checked="formState.api_key_enabled"
                            :disabled="settings?.settings_locked"
                          />
                        </FormItem>
                      </Col>
                      <Col :span="12">
                        <FormItem label="Rate Limit (per hour)">
                          <InputNumber
                            v-model:value="formState.api_rate_limit_per_hour"
                            :min="10"
                            :max="100000"
                            :disabled="settings?.settings_locked"
                            style="width: 100%"
                          />
                        </FormItem>
                      </Col>
                      <Col :span="12">
                        <FormItem label="Rate Limit (per minute)">
                          <InputNumber
                            v-model:value="formState.api_rate_limit_per_minute"
                            :min="1"
                            :max="1000"
                            :disabled="settings?.settings_locked"
                            style="width: 100%"
                          />
                        </FormItem>
                      </Col>
                    </Row>
                  </Form>
                </TabPane>

                <!-- Session Security -->
                <TabPane key="session" tab="Sessions">
                  <Form layout="vertical">
                    <Row :gutter="16">
                      <Col :span="12">
                        <FormItem label="Max Concurrent Sessions">
                          <InputNumber
                            v-model:value="formState.max_concurrent_sessions"
                            :min="1"
                            :max="50"
                            :disabled="settings?.settings_locked"
                            style="width: 100%"
                          />
                        </FormItem>
                      </Col>
                      <Col :span="12">
                        <FormItem label="Session Timeout (minutes)">
                          <InputNumber
                            v-model:value="formState.session_timeout_minutes"
                            :min="5"
                            :max="10080"
                            :disabled="settings?.settings_locked"
                            style="width: 100%"
                          />
                        </FormItem>
                      </Col>
                      <Col :span="12">
                        <FormItem label="Require Session IP Binding">
                          <Switch
                            v-model:checked="formState.require_session_ip_binding"
                            :disabled="settings?.settings_locked"
                          />
                          <div class="text-gray-500 text-sm mt-1">
                            Invalidate session if IP changes
                          </div>
                        </FormItem>
                      </Col>
                      <Col :span="12">
                        <FormItem label="Re-auth for Sensitive Actions">
                          <Switch
                            v-model:checked="formState.require_reauth_for_sensitive"
                            :disabled="settings?.settings_locked"
                          />
                        </FormItem>
                      </Col>
                    </Row>
                  </Form>
                </TabPane>

                <!-- Login Restrictions -->
                <TabPane key="login" tab="Login Restrictions">
                  <Form layout="vertical">
                    <Row :gutter="16">
                      <Col :span="12">
                        <FormItem label="Max Failed Attempts">
                          <InputNumber
                            v-model:value="formState.max_failed_login_attempts"
                            :min="1"
                            :max="20"
                            :disabled="settings?.settings_locked"
                            style="width: 100%"
                          />
                        </FormItem>
                      </Col>
                      <Col :span="12">
                        <FormItem label="Lockout Duration (minutes)">
                          <InputNumber
                            v-model:value="formState.lockout_duration_minutes"
                            :min="1"
                            :max="1440"
                            :disabled="settings?.settings_locked"
                            style="width: 100%"
                          />
                        </FormItem>
                      </Col>
                    </Row>

                    <Divider>Time-Based Restrictions</Divider>

                    <FormItem label="Enable Login Hours">
                      <Switch
                        v-model:checked="formState.login_hours_enabled"
                        :disabled="settings?.settings_locked"
                      />
                    </FormItem>

                    <Row v-if="formState.login_hours_enabled" :gutter="16">
                      <Col :span="8">
                        <FormItem label="Start Time">
                          <TimePicker
                            v-model:value="loginHoursStart"
                            format="HH:mm"
                            :disabled="settings?.settings_locked"
                            style="width: 100%"
                          />
                        </FormItem>
                      </Col>
                      <Col :span="8">
                        <FormItem label="End Time">
                          <TimePicker
                            v-model:value="loginHoursEnd"
                            format="HH:mm"
                            :disabled="settings?.settings_locked"
                            style="width: 100%"
                          />
                        </FormItem>
                      </Col>
                      <Col :span="8">
                        <FormItem label="Timezone">
                          <Select
                            v-model:value="formState.login_hours_timezone"
                            :disabled="settings?.settings_locked"
                            style="width: 100%"
                          >
                            <SelectOption value="UTC">UTC</SelectOption>
                            <SelectOption value="America/New_York">Eastern</SelectOption>
                            <SelectOption value="America/Los_Angeles">Pacific</SelectOption>
                            <SelectOption value="Europe/London">London</SelectOption>
                            <SelectOption value="Asia/Kolkata">India</SelectOption>
                          </Select>
                        </FormItem>
                      </Col>
                      <Col :span="24">
                        <FormItem label="Allowed Days">
                          <CheckboxGroup
                            v-model:value="formState.login_days_allowed"
                            :disabled="settings?.settings_locked"
                          >
                            <Checkbox :value="1">Mon</Checkbox>
                            <Checkbox :value="2">Tue</Checkbox>
                            <Checkbox :value="3">Wed</Checkbox>
                            <Checkbox :value="4">Thu</Checkbox>
                            <Checkbox :value="5">Fri</Checkbox>
                            <Checkbox :value="6">Sat</Checkbox>
                            <Checkbox :value="7">Sun</Checkbox>
                          </CheckboxGroup>
                        </FormItem>
                      </Col>
                    </Row>

                    <Divider>IP Restrictions</Divider>

                    <Row :gutter="16">
                      <Col :span="12">
                        <FormItem label="Allowed Login IPs (CIDR)">
                          <Select
                            v-model:value="formState.allowed_login_ips"
                            mode="tags"
                            placeholder="e.g., 192.168.1.0/24"
                            :disabled="settings?.settings_locked"
                            style="width: 100%"
                          />
                        </FormItem>
                      </Col>
                      <Col :span="12">
                        <FormItem label="Blocked Login IPs (CIDR)">
                          <Select
                            v-model:value="formState.blocked_login_ips"
                            mode="tags"
                            placeholder="e.g., 10.0.0.0/8"
                            :disabled="settings?.settings_locked"
                            style="width: 100%"
                          />
                        </FormItem>
                      </Col>
                    </Row>
                  </Form>
                </TabPane>

                <!-- Password Policy -->
                <TabPane key="password" tab="Password Policy">
                  <Form layout="vertical">
                    <Row :gutter="16">
                      <Col :span="12">
                        <FormItem label="Password Expires (days)">
                          <InputNumber
                            v-model:value="formState.password_expires_days"
                            :min="0"
                            :max="365"
                            :disabled="settings?.settings_locked"
                            style="width: 100%"
                          />
                          <div class="text-gray-500 text-sm mt-1">0 = never expires</div>
                        </FormItem>
                      </Col>
                      <Col :span="12">
                        <FormItem label="Min Password Length">
                          <InputNumber
                            v-model:value="formState.password_min_length"
                            :min="6"
                            :max="128"
                            :disabled="settings?.settings_locked"
                            style="width: 100%"
                          />
                        </FormItem>
                      </Col>
                      <Col :span="12">
                        <FormItem label="Password History Count">
                          <InputNumber
                            v-model:value="formState.password_history_count"
                            :min="0"
                            :max="20"
                            :disabled="settings?.settings_locked"
                            style="width: 100%"
                          />
                          <div class="text-gray-500 text-sm mt-1">
                            Prevent reusing last N passwords
                          </div>
                        </FormItem>
                      </Col>
                    </Row>

                    <Divider>Password Requirements</Divider>

                    <Row :gutter="16">
                      <Col :span="6">
                        <FormItem>
                          <Checkbox
                            v-model:checked="formState.password_require_uppercase"
                            :disabled="settings?.settings_locked"
                          >
                            Uppercase
                          </Checkbox>
                        </FormItem>
                      </Col>
                      <Col :span="6">
                        <FormItem>
                          <Checkbox
                            v-model:checked="formState.password_require_lowercase"
                            :disabled="settings?.settings_locked"
                          >
                            Lowercase
                          </Checkbox>
                        </FormItem>
                      </Col>
                      <Col :span="6">
                        <FormItem>
                          <Checkbox
                            v-model:checked="formState.password_require_numbers"
                            :disabled="settings?.settings_locked"
                          >
                            Numbers
                          </Checkbox>
                        </FormItem>
                      </Col>
                      <Col :span="6">
                        <FormItem>
                          <Checkbox
                            v-model:checked="formState.password_require_special"
                            :disabled="settings?.settings_locked"
                          >
                            Special Chars
                          </Checkbox>
                        </FormItem>
                      </Col>
                    </Row>
                  </Form>
                </TabPane>

                <!-- Admin Controls -->
                <TabPane key="admin" tab="Admin Controls">
                  <Form layout="vertical">
                    <Alert
                      v-if="settings?.admin_locked"
                      type="error"
                      :message="`Account locked: ${settings.admin_lock_reason || 'No reason specified'}`"
                      show-icon
                      class="mb-4"
                    />

                    <FormItem label="Lock User Settings">
                      <Switch v-model:checked="formState.settings_locked" />
                      <div class="text-gray-500 text-sm mt-1">
                        Prevent user from modifying their own security settings
                      </div>
                    </FormItem>

                    <FormItem label="Admin Notes">
                      <Textarea
                        v-model:value="formState.admin_notes"
                        :rows="4"
                        placeholder="Internal notes about this user's security..."
                      />
                    </FormItem>
                  </Form>
                </TabPane>
              </Tabs>

              <Divider />

              <div class="flex justify-end gap-2">
                <Button @click="resetForm">Reset</Button>
                <Button
                  type="primary"
                  :loading="saving"
                  @click="saveSettings"
                >
                  Save Changes
                </Button>
              </div>
            </Card>
          </Spin>
        </template>

        <template v-else>
          <AEmpty description="Select a user from the list to manage their security settings" />
        </template>
      </Col>
    </Row>

    <!-- Lock Account Modal -->
    <Modal
      v-model:open="showLockModal"
      title="Lock User Account"
      @ok="handleLockAccount"
      :confirm-loading="actionLoading"
    >
      <Alert
        type="warning"
        message="This will immediately terminate all user sessions and prevent login."
        show-icon
        class="mb-4"
      />
      <Form layout="vertical">
        <FormItem label="Reason" required>
          <Textarea
            v-model:value="lockReason"
            :rows="3"
            placeholder="Enter reason for locking this account..."
          />
        </FormItem>
      </Form>
    </Modal>

    <!-- Reset 2FA Modal -->
    <Modal
      v-model:open="showReset2FAModal"
      title="Reset Two-Factor Authentication"
      @ok="handleReset2FA"
      :confirm-loading="actionLoading"
    >
      <Alert
        type="warning"
        message="This will disable 2FA for the user. They will need to set it up again."
        show-icon
        class="mb-4"
      />
      <Form layout="vertical">
        <FormItem label="Reason" required>
          <Textarea
            v-model:value="reset2FAReason"
            :rows="3"
            placeholder="Enter reason for resetting 2FA..."
          />
        </FormItem>
      </Form>
    </Modal>

    <!-- Bulk Actions Modal -->
    <Modal
      v-model:open="showBulkActionsModal"
      title="Bulk Security Actions"
      width="600px"
      :footer="null"
    >
      <Tabs>
        <TabPane key="force2fa" tab="Force 2FA">
          <Form layout="vertical">
            <FormItem label="Select Users">
              <Select
                v-model:value="bulkUserIds"
                mode="multiple"
                placeholder="Select users..."
                :options="users.map(u => ({ value: u.id, label: u.username }))"
                style="width: 100%"
              />
            </FormItem>
            <Button
              type="primary"
              :loading="bulkLoading"
              @click="handleBulkForce2FA"
            >
              Force 2FA for Selected Users
            </Button>
          </Form>
        </TabPane>
      </Tabs>
    </Modal>

    <!-- Compliance Report Modal -->
    <Modal
      v-model:open="showComplianceModal"
      title="Security Compliance Report"
      width="700px"
      :footer="null"
    >
      <Spin :spinning="loadingCompliance">
        <template v-if="complianceReport">
          <Row :gutter="16" class="mb-4">
            <Col :span="6">
              <Statistic title="Total Users" :value="complianceReport.total_users" />
            </Col>
            <Col :span="6">
              <Statistic
                title="2FA Enabled"
                :value="complianceReport.two_factor_enabled_count"
                :suffix="`(${complianceReport.two_factor_enabled_percentage}%)`"
              />
            </Col>
            <Col :span="6">
              <Statistic title="Locked Accounts" :value="complianceReport.locked_accounts_count" />
            </Col>
            <Col :span="6">
              <Statistic title="Inactive Users" :value="complianceReport.inactive_users_count" />
            </Col>
          </Row>

          <Divider>Recommendations</Divider>

          <Alert
            v-for="(rec, index) in complianceReport.recommendations"
            :key="index"
            type="info"
            :message="rec"
            show-icon
            class="mb-2"
          />
        </template>
      </Spin>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import {
  message,
  Button,
  Card,
  Row,
  Col,
  List,
  ListItem,
  Avatar,
  Progress,
  Descriptions,
  DescriptionsItem,
  Alert,
  Form,
  FormItem,
  TabPane,
  Tabs,
  InputNumber,
  Divider,
  TimePicker,
  SelectOption,
  Select,
  Textarea,
  Checkbox,
  CheckboxGroup,
  Switch,
  Spin,
  Empty,
  Modal,
  Statistic,
  Tag,
  Space,
  PageHeader,
  Input,
} from 'ant-design-vue';
import {
  SearchOutlined,
  LockOutlined,
  UnlockOutlined,
  SafetyOutlined,
  ReloadOutlined,
  DisconnectOutlined,
  BarChartOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue';
import dayjs from 'dayjs';

import { requestClient } from '#/api/request';
import {
  getUserSecuritySettingsApi,
  updateUserSecuritySettingsApi,
  getUserSecurityScoreApi,
  forceUser2FAApi,
  resetUser2FAApi,
  lockUserAccountApi,
  unlockUserAccountApi,
  terminateUserSessionsApi,
  bulkForce2FAApi,
  getSecurityComplianceReportApi,
} from '#/api/core/base_security';

// State
const users = ref([]);
const loadingUsers = ref(false);
const searchQuery = ref('');
const selectedUser = ref(null);

const settings = ref(null);
const securityScore = ref(null);
const loadingSettings = ref(false);
const saving = ref(false);
const actionLoading = ref(false);

const activeTab = ref('2fa');

// Form state
const formState = ref({});

// Time pickers
const loginHoursStart = ref(null);
const loginHoursEnd = ref(null);

// Modals
const showLockModal = ref(false);
const showReset2FAModal = ref(false);
const showBulkActionsModal = ref(false);
const showComplianceModal = ref(false);

const lockReason = ref('');
const reset2FAReason = ref('');

// Bulk actions
const bulkUserIds = ref([]);
const bulkLoading = ref(false);

// Compliance
const complianceReport = ref(null);
const loadingCompliance = ref(false);

// Computed
const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value;
  const query = searchQuery.value.toLowerCase();
  return users.value.filter(u =>
    u.username.toLowerCase().includes(query) ||
    u.email.toLowerCase().includes(query) ||
    (u.full_name && u.full_name.toLowerCase().includes(query))
  );
});

// Methods
async function fetchUsers() {
  loadingUsers.value = true;
  try {
    const response = await requestClient.get('/users/', {
      params: { limit: 100, is_active: true },
    });
    users.value = response.items || response;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    message.error('Failed to load users');
  } finally {
    loadingUsers.value = false;
  }
}

async function selectUser(user) {
  selectedUser.value = user;
  await fetchUserSettings(user.id);
}

async function fetchUserSettings(userId) {
  loadingSettings.value = true;
  try {
    const [settingsRes, scoreRes] = await Promise.all([
      getUserSecuritySettingsApi(userId),
      getUserSecurityScoreApi(userId),
    ]);

    settings.value = settingsRes;
    securityScore.value = scoreRes;

    // Initialize form state
    formState.value = { ...settingsRes };

    // Handle time fields
    if (settingsRes.login_hours_start) {
      loginHoursStart.value = dayjs(settingsRes.login_hours_start, 'HH:mm');
    }
    if (settingsRes.login_hours_end) {
      loginHoursEnd.value = dayjs(settingsRes.login_hours_end, 'HH:mm');
    }
  } catch (error) {
    console.error('Failed to fetch user settings:', error);
    message.error('Failed to load user security settings');
  } finally {
    loadingSettings.value = false;
  }
}

async function saveSettings() {
  if (!selectedUser.value) return;

  saving.value = true;
  try {
    // Prepare data
    const data = { ...formState.value };

    // Handle time fields
    if (loginHoursStart.value) {
      data.login_hours_start = loginHoursStart.value.format('HH:mm');
    }
    if (loginHoursEnd.value) {
      data.login_hours_end = loginHoursEnd.value.format('HH:mm');
    }

    await updateUserSecuritySettingsApi(selectedUser.value.id, data);
    message.success('Security settings saved successfully');

    // Refresh
    await fetchUserSettings(selectedUser.value.id);
  } catch (error) {
    console.error('Failed to save settings:', error);
    message.error(error?.response?.data?.detail || 'Failed to save settings');
  } finally {
    saving.value = false;
  }
}

function resetForm() {
  if (settings.value) {
    formState.value = { ...settings.value };
  }
}

async function handleForce2FA() {
  if (!selectedUser.value) return;

  actionLoading.value = true;
  try {
    await forceUser2FAApi(selectedUser.value.id);
    message.success('2FA requirement enabled for user');
    await fetchUserSettings(selectedUser.value.id);
  } catch (error) {
    console.error('Failed to force 2FA:', error);
    message.error(error?.response?.data?.detail || 'Failed to enable 2FA requirement');
  } finally {
    actionLoading.value = false;
  }
}

async function handleReset2FA() {
  if (!selectedUser.value || !reset2FAReason.value) {
    message.warning('Please enter a reason');
    return;
  }

  actionLoading.value = true;
  try {
    await resetUser2FAApi(selectedUser.value.id, { user_id: selectedUser.value.id, reason: reset2FAReason.value });
    message.success('2FA reset successfully');
    showReset2FAModal.value = false;
    reset2FAReason.value = '';
    await fetchUserSettings(selectedUser.value.id);
  } catch (error) {
    console.error('Failed to reset 2FA:', error);
    message.error(error?.response?.data?.detail || 'Failed to reset 2FA');
  } finally {
    actionLoading.value = false;
  }
}

async function handleLockAccount() {
  if (!selectedUser.value || !lockReason.value) {
    message.warning('Please enter a reason');
    return;
  }

  actionLoading.value = true;
  try {
    await lockUserAccountApi(selectedUser.value.id, { user_id: selectedUser.value.id, reason: lockReason.value });
    message.success('Account locked successfully');
    showLockModal.value = false;
    lockReason.value = '';
    await fetchUserSettings(selectedUser.value.id);
  } catch (error) {
    console.error('Failed to lock account:', error);
    message.error(error?.response?.data?.detail || 'Failed to lock account');
  } finally {
    actionLoading.value = false;
  }
}

async function handleUnlockAccount() {
  if (!selectedUser.value) return;

  actionLoading.value = true;
  try {
    await unlockUserAccountApi(selectedUser.value.id);
    message.success('Account unlocked successfully');
    await fetchUserSettings(selectedUser.value.id);
  } catch (error) {
    console.error('Failed to unlock account:', error);
    message.error(error?.response?.data?.detail || 'Failed to unlock account');
  } finally {
    actionLoading.value = false;
  }
}

async function handleTerminateSessions() {
  if (!selectedUser.value) return;

  actionLoading.value = true;
  try {
    await terminateUserSessionsApi(selectedUser.value.id, { reason: 'Admin action' });
    message.success('All sessions terminated');
  } catch (error) {
    console.error('Failed to terminate sessions:', error);
    message.error(error?.response?.data?.detail || 'Failed to terminate sessions');
  } finally {
    actionLoading.value = false;
  }
}

async function handleBulkForce2FA() {
  if (!bulkUserIds.value.length) {
    message.warning('Please select at least one user');
    return;
  }

  bulkLoading.value = true;
  try {
    const result = await bulkForce2FAApi(bulkUserIds.value);
    message.success(`2FA forced for ${result.success_count} users`);
    if (result.failure_count > 0) {
      message.warning(`Failed for ${result.failure_count} users`);
    }
    showBulkActionsModal.value = false;
    bulkUserIds.value = [];
  } catch (error) {
    console.error('Failed to bulk force 2FA:', error);
    message.error('Failed to process bulk action');
  } finally {
    bulkLoading.value = false;
  }
}

async function fetchComplianceReport() {
  showComplianceModal.value = true;
  loadingCompliance.value = true;
  try {
    complianceReport.value = await getSecurityComplianceReportApi();
  } catch (error) {
    console.error('Failed to fetch compliance report:', error);
    message.error('Failed to load compliance report');
  } finally {
    loadingCompliance.value = false;
  }
}

function getScoreColor(score) {
  if (!score) return '#d9d9d9';
  if (score >= 80) return '#52c41a';
  if (score >= 60) return '#1890ff';
  if (score >= 40) return '#faad14';
  return '#ff4d4f';
}

function handleBack() {
  selectedUser.value = null;
  settings.value = null;
}

function handleSearch() {
  // Debounce handled by v-model
}

onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
.user-security-settings {
  padding: 16px;
}

.user-list {
  max-height: 500px;
  overflow-y: auto;
}

.user-list :deep(.ant-list-item) {
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 4px;
}

.user-list :deep(.ant-list-item:hover) {
  background-color: #f5f5f5;
}

.selected-user {
  background-color: #e6f7ff !important;
  border: 1px solid #1890ff;
}
</style>
