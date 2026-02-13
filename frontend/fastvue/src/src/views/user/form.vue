<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ActivityThread, Page } from '@vben/common-ui';
import { useAccessStore } from '@vben/stores';

import {
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Tree,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CrownOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  KeyOutlined,
  LockOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  TeamOutlined,
  UnlockOutlined,
} from '@ant-design/icons-vue';

import {
  createUserApi,
  getUserApi,
  updateUserApi,
  type UserApi,
} from '#/api/user';
import {
  getPermissionsApi,
  type SettingsApi,
} from '#/api/settings';
import {
  createAccessRuleApi,
  deleteAccessRuleApi,
  getAccessRulesApi,
  getContentTypesApi,
  getMenuItemsTreeApi,
  getUserMenuPermissionsApi,
  setUserMenuPermissionsApi,
  type RBACApi,
  updateAccessRuleApi,
} from '#/api/rbac';
import {
  getUserSecuritySettingsApi,
  getUserSecurityScoreApi,
  updateUserSecuritySettingsApi,
  forceUser2FAApi,
  resetUser2FAApi,
  lockUserAccountApi,
  unlockUserAccountApi,
  terminateUserSessionsApi,
  type UserSecuritySettings,
  type UserSecurityScore,
} from '#/api/core/security';

defineOptions({
  name: 'UserForm',
});

const route = useRoute();
const router = useRouter();
const accessStore = useAccessStore();

const isEditMode = computed(() => route.name === 'UserEdit');
const isCreateMode = computed(() => route.name === 'UserCreate');
const userId = computed(() => Number(route.params.id));
const activeTab = ref('general');

const loading = ref(false);
const submitting = ref(false);
const formRef = ref();

// User form data
const formState = reactive({
  username: '',
  email: '',
  full_name: '',
  phone: '',
  password: '',
  confirm_password: '',
  is_active: true,
  timezone: 'UTC',
  language: 'en',
});

// User details (for display in edit mode)
const userDetails = ref<UserApi.User | null>(null);

// Company roles (for display)
const companyRoles = ref<UserApi.CompanyRoleInfo[]>([]);

// Permissions
const allPermissions = ref<SettingsApi.Permission[]>([]);
const groupedPermissions = ref<Record<string, SettingsApi.Permission[]>>({});
const selectedPermissions = ref<number[]>([]);
const loadingPermissions = ref(false);

// Menu Access (RBAC)
const menuItems = ref<RBACApi.MenuItem[]>([]);
const selectedMenuCodes = ref<string[]>([]);
const loadingMenus = ref(false);
const savingMenuPerms = ref(false);

// Access Rules
const accessRules = ref<RBACApi.AccessRule[]>([]);
const userAccessRules = computed(() =>
  accessRules.value.filter(r => r.user === userId.value)
);
const contentTypes = ref<RBACApi.ContentType[]>([]);
const showAccessRuleModal = ref(false);
const editingAccessRule = ref<RBACApi.AccessRule | null>(null);
const accessRuleForm = reactive({
  name: '',
  description: '',
  content_type: undefined as number | undefined,
  scope: 'own' as 'own' | 'department' | 'company' | 'all' | 'custom',
  can_view: true,
  can_add: false,
  can_change: false,
  can_delete: false,
  priority: 0,
  is_active: true,
});
const loadingAccessRules = ref(false);
const savingAccessRule = ref(false);

// Security Settings
const securitySettings = ref<UserSecuritySettings | null>(null);
const securityScore = ref<UserSecurityScore | null>(null);
const loadingSecuritySettings = ref(false);
const savingSecuritySettings = ref(false);
const securityFormState = reactive({
  // 2FA
  two_factor_required: false,
  two_factor_methods: ['totp'] as string[],
  // API
  api_access_enabled: true,
  api_rate_limit_per_hour: 1000,
  api_rate_limit_per_minute: 60,
  api_key_enabled: false,
  // Session
  max_concurrent_sessions: 5,
  session_timeout_minutes: 1440,
  require_session_ip_binding: false,
  // Login
  max_failed_login_attempts: 5,
  lockout_duration_minutes: 30,
  // Password
  password_expires_days: 0,
  password_min_length: 8,
  password_require_uppercase: true,
  password_require_lowercase: true,
  password_require_numbers: true,
  password_require_special: false,
  // Notifications
  notify_on_login: false,
  notify_on_failed_login: true,
  notify_on_password_change: true,
  notify_on_2fa_change: true,
  notify_on_new_device: true,
  // Activity
  activity_logging_enabled: true,
  // Admin
  admin_locked: false,
  admin_notes: '',
  settings_locked: false,
});

// Security modals
const showLockAccountModal = ref(false);
const showReset2FAModal = ref(false);
const lockReason = ref('');
const reset2FAReason = ref('');
const securityActionLoading = ref(false);

const accessRuleColumns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Model', dataIndex: 'content_type_name', key: 'content_type_name' },
  { title: 'Scope', dataIndex: 'scope', key: 'scope' },
  { title: 'Permissions', key: 'permissions' },
  { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 80 },
  { title: 'Status', key: 'status', width: 80 },
  { title: 'Actions', key: 'actions', width: 120 },
];

const scopeLabels: Record<string, string> = {
  own: 'Own Records',
  department: 'Department',
  company: 'Company',
  all: 'All Records',
  custom: 'Custom',
};

const rules: Record<string, any> = {
  username: [{ required: true, message: 'Username is required', trigger: 'blur' }],
  email: [
    { required: true, message: 'Email is required', trigger: 'blur' },
    { type: 'email' as const, message: 'Please enter a valid email', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Password is required', trigger: 'blur' },
    { min: 8, message: 'Password must be at least 8 characters', trigger: 'blur' },
  ],
  confirm_password: [
    { required: true, message: 'Please confirm password', trigger: 'blur' },
    {
      validator: (_rule: any, value: string) => {
        if (value !== formState.password) {
          return Promise.reject('Passwords do not match');
        }
        return Promise.resolve();
      },
      trigger: 'blur',
    },
  ],
};

// Convert menu items to tree data for Ant Design Tree
function convertToTreeData(items: RBACApi.MenuItem[]): any[] {
  return items.map((item) => ({
    key: item.code,
    title: item.name,
    icon: item.icon,
    children: item.children ? convertToTreeData(item.children) : [],
  }));
}

// Fetch reference data (groups removed - using company roles from FastAPI)

async function fetchPermissions() {
  loadingPermissions.value = true;
  try {
    const response = await getPermissionsApi({ page_size: 100 });
    allPermissions.value = response.items || [];
    groupedPermissions.value = response.grouped || {};
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
  } finally {
    loadingPermissions.value = false;
  }
}

async function fetchMenuItems() {
  try {
    menuItems.value = await getMenuItemsTreeApi();
  } catch (error) {
    console.error('Failed to fetch menu items:', error);
  }
}

async function fetchContentTypes() {
  try {
    contentTypes.value = await getContentTypesApi();
  } catch (error) {
    console.error('Failed to fetch content types:', error);
  }
}

async function fetchUser() {
  if (!isEditMode.value) return;

  loading.value = true;
  try {
    const user = await getUserApi(userId.value);
    userDetails.value = user;

    Object.assign(formState, {
      username: user.username,
      email: user.email,
      full_name: user.full_name || '',
      phone: user.phone || '',
      password: '',
      confirm_password: '',
      is_active: user.is_active,
      timezone: user.timezone || 'UTC',
      language: user.language || 'en',
    });

    // Store company roles for display
    companyRoles.value = user.company_roles || [];

    // Fetch menu permissions
    await fetchUserMenuPermissions();
    // Fetch access rules
    await fetchAccessRules();
    // Fetch security settings
    await fetchSecuritySettings();
  } catch (error) {
    console.error('Failed to fetch user:', error);
    message.error('Failed to load user data');
    router.push('/settings/users');
  } finally {
    loading.value = false;
  }
}

async function fetchUserMenuPermissions() {
  if (!userId.value) return;

  loadingMenus.value = true;
  try {
    const response = await getUserMenuPermissionsApi(userId.value);
    selectedMenuCodes.value = (response.permissions || [])
      .filter((p: any) => p.can_view)
      .map((p: any) => p.menu_code || p.code);
  } catch (error) {
    console.error('Failed to fetch menu permissions:', error);
    selectedMenuCodes.value = [];
  } finally {
    loadingMenus.value = false;
  }
}

async function fetchAccessRules() {
  loadingAccessRules.value = true;
  try {
    const response = await getAccessRulesApi();
    accessRules.value = response.items || [];
  } catch (error) {
    console.error('Failed to fetch access rules:', error);
  } finally {
    loadingAccessRules.value = false;
  }
}

async function fetchSecuritySettings() {
  if (!userId.value) return;

  loadingSecuritySettings.value = true;
  try {
    const [settings, score] = await Promise.all([
      getUserSecuritySettingsApi(userId.value),
      getUserSecurityScoreApi(userId.value),
    ]);

    securitySettings.value = settings;
    securityScore.value = score;

    // Update form state
    Object.assign(securityFormState, {
      two_factor_required: settings.two_factor_required,
      two_factor_methods: settings.two_factor_methods || ['totp'],
      api_access_enabled: settings.api_access_enabled,
      api_rate_limit_per_hour: settings.api_rate_limit_per_hour,
      api_rate_limit_per_minute: settings.api_rate_limit_per_minute,
      api_key_enabled: settings.api_key_enabled,
      max_concurrent_sessions: settings.max_concurrent_sessions,
      session_timeout_minutes: settings.session_timeout_minutes,
      require_session_ip_binding: settings.require_session_ip_binding,
      max_failed_login_attempts: settings.max_failed_login_attempts,
      lockout_duration_minutes: settings.lockout_duration_minutes,
      password_expires_days: settings.password_expires_days,
      password_min_length: settings.password_min_length,
      password_require_uppercase: settings.password_require_uppercase,
      password_require_lowercase: settings.password_require_lowercase,
      password_require_numbers: settings.password_require_numbers,
      password_require_special: settings.password_require_special,
      notify_on_login: settings.notify_on_login,
      notify_on_failed_login: settings.notify_on_failed_login,
      notify_on_password_change: settings.notify_on_password_change,
      notify_on_2fa_change: settings.notify_on_2fa_change,
      notify_on_new_device: settings.notify_on_new_device,
      activity_logging_enabled: settings.activity_logging_enabled,
      admin_locked: settings.admin_locked,
      admin_notes: settings.admin_notes || '',
      settings_locked: settings.settings_locked,
    });
  } catch (error) {
    console.error('Failed to fetch security settings:', error);
  } finally {
    loadingSecuritySettings.value = false;
  }
}

async function saveSecuritySettings() {
  if (!userId.value) return;

  savingSecuritySettings.value = true;
  try {
    await updateUserSecuritySettingsApi(userId.value, {
      two_factor_required: securityFormState.two_factor_required,
      two_factor_methods: securityFormState.two_factor_methods,
      api_access_enabled: securityFormState.api_access_enabled,
      api_rate_limit_per_hour: securityFormState.api_rate_limit_per_hour,
      api_rate_limit_per_minute: securityFormState.api_rate_limit_per_minute,
      api_key_enabled: securityFormState.api_key_enabled,
      max_concurrent_sessions: securityFormState.max_concurrent_sessions,
      session_timeout_minutes: securityFormState.session_timeout_minutes,
      require_session_ip_binding: securityFormState.require_session_ip_binding,
      max_failed_login_attempts: securityFormState.max_failed_login_attempts,
      lockout_duration_minutes: securityFormState.lockout_duration_minutes,
      password_expires_days: securityFormState.password_expires_days,
      password_min_length: securityFormState.password_min_length,
      password_require_uppercase: securityFormState.password_require_uppercase,
      password_require_lowercase: securityFormState.password_require_lowercase,
      password_require_numbers: securityFormState.password_require_numbers,
      password_require_special: securityFormState.password_require_special,
      notify_on_login: securityFormState.notify_on_login,
      notify_on_failed_login: securityFormState.notify_on_failed_login,
      notify_on_password_change: securityFormState.notify_on_password_change,
      notify_on_2fa_change: securityFormState.notify_on_2fa_change,
      notify_on_new_device: securityFormState.notify_on_new_device,
      activity_logging_enabled: securityFormState.activity_logging_enabled,
      admin_notes: securityFormState.admin_notes || null,
      settings_locked: securityFormState.settings_locked,
    });
    message.success('Security settings saved successfully');
    await fetchSecuritySettings();
  } catch (error: any) {
    console.error('Failed to save security settings:', error);
    message.error(error?.response?.data?.detail || 'Failed to save security settings');
  } finally {
    savingSecuritySettings.value = false;
  }
}

async function handleForce2FA() {
  if (!userId.value) return;

  securityActionLoading.value = true;
  try {
    await forceUser2FAApi(userId.value);
    message.success('2FA requirement enabled for user');
    await fetchSecuritySettings();
  } catch (error: any) {
    console.error('Failed to force 2FA:', error);
    message.error(error?.response?.data?.detail || 'Failed to force 2FA');
  } finally {
    securityActionLoading.value = false;
  }
}

async function handleReset2FA() {
  if (!userId.value || !reset2FAReason.value) {
    message.warning('Please enter a reason');
    return;
  }

  securityActionLoading.value = true;
  try {
    await resetUser2FAApi(userId.value, { user_id: userId.value, reason: reset2FAReason.value });
    message.success('2FA reset successfully');
    showReset2FAModal.value = false;
    reset2FAReason.value = '';
    await fetchSecuritySettings();
  } catch (error: any) {
    console.error('Failed to reset 2FA:', error);
    message.error(error?.response?.data?.detail || 'Failed to reset 2FA');
  } finally {
    securityActionLoading.value = false;
  }
}

async function handleLockAccount() {
  if (!userId.value || !lockReason.value) {
    message.warning('Please enter a reason');
    return;
  }

  securityActionLoading.value = true;
  try {
    await lockUserAccountApi(userId.value, { user_id: userId.value, reason: lockReason.value });
    message.success('Account locked successfully');
    showLockAccountModal.value = false;
    lockReason.value = '';
    await fetchSecuritySettings();
  } catch (error: any) {
    console.error('Failed to lock account:', error);
    message.error(error?.response?.data?.detail || 'Failed to lock account');
  } finally {
    securityActionLoading.value = false;
  }
}

async function handleUnlockAccount() {
  if (!userId.value) return;

  securityActionLoading.value = true;
  try {
    await unlockUserAccountApi(userId.value);
    message.success('Account unlocked successfully');
    await fetchSecuritySettings();
  } catch (error: any) {
    console.error('Failed to unlock account:', error);
    message.error(error?.response?.data?.detail || 'Failed to unlock account');
  } finally {
    securityActionLoading.value = false;
  }
}

async function handleTerminateSessions() {
  if (!userId.value) return;

  securityActionLoading.value = true;
  try {
    await terminateUserSessionsApi(userId.value, { reason: 'Admin action' });
    message.success('All sessions terminated');
  } catch (error: any) {
    console.error('Failed to terminate sessions:', error);
    message.error(error?.response?.data?.detail || 'Failed to terminate sessions');
  } finally {
    securityActionLoading.value = false;
  }
}

function getSecurityScoreColor(score: number | undefined) {
  if (!score) return '#d9d9d9';
  if (score >= 80) return '#52c41a';
  if (score >= 60) return '#1890ff';
  if (score >= 40) return '#faad14';
  return '#ff4d4f';
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();
  } catch {
    message.error('Please fill in all required fields');
    return;
  }

  submitting.value = true;
  try {
    if (isEditMode.value) {
      const updateData: UserApi.UserUpdate = {
        email: formState.email,
        full_name: formState.full_name || undefined,
        phone: formState.phone || undefined,
        is_active: formState.is_active,
        timezone: formState.timezone,
        language: formState.language,
      };
      await updateUserApi(userId.value, updateData);
      message.success('User updated successfully');
    } else {
      const createData: UserApi.UserCreate = {
        email: formState.email,
        username: formState.username,
        password: formState.password,
        full_name: formState.full_name || undefined,
        phone: formState.phone || undefined,
        is_active: formState.is_active,
        timezone: formState.timezone,
        language: formState.language,
      };
      const newUser = await createUserApi(createData);
      message.success('User created successfully');
      // Redirect to edit mode
      router.replace({ name: 'UserEdit', params: { id: newUser.id } });
      return;
    }

    router.push('/settings/users');
  } catch (error: any) {
    console.error('Failed to save user:', error);
    message.error(error?.response?.data?.detail || 'Failed to save user');
  } finally {
    submitting.value = false;
  }
}

function handleCancel() {
  router.push('/settings/users');
}

function handleBack() {
  router.back();
}

// Permission helpers
function isPermissionSelected(permId: number) {
  return selectedPermissions.value.includes(permId);
}

function togglePermission(permId: number) {
  const index = selectedPermissions.value.indexOf(permId);
  if (index === -1) {
    selectedPermissions.value.push(permId);
  } else {
    selectedPermissions.value.splice(index, 1);
  }
}

function selectAllInGroup(groupPerms: SettingsApi.Permission[]) {
  const permIds = groupPerms.map((p) => p.id);
  const allSelected = permIds.every((id) => selectedPermissions.value.includes(id));

  if (allSelected) {
    selectedPermissions.value = selectedPermissions.value.filter((id) => !permIds.includes(id));
  } else {
    permIds.forEach((id) => {
      if (!selectedPermissions.value.includes(id)) {
        selectedPermissions.value.push(id);
      }
    });
  }
}

function isGroupFullySelected(groupPerms: SettingsApi.Permission[]) {
  return groupPerms.every((p) => selectedPermissions.value.includes(p.id));
}

function formatGroupName(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');
}

// Menu permission functions
async function saveMenuPermissions() {
  if (!userId.value) {
    message.warning('Please save the user first');
    return;
  }

  savingMenuPerms.value = true;
  try {
    const menuPerms: import('#/api/rbac').MenuPermissionWithPriority[] = selectedMenuCodes.value.map((code: string) => ({
      menu_item_id: 0,
      menu_code: code,
      can_view: true,
      can_edit: false,
      can_delete: false,
      can_create: false,
      priority: 0,
    }));
    await setUserMenuPermissionsApi(userId.value, menuPerms);
    message.success('Menu permissions saved successfully');
  } catch (error: any) {
    console.error('Failed to save menu permissions:', error);
    message.error(error?.response?.data?.error || 'Failed to save menu permissions');
  } finally {
    savingMenuPerms.value = false;
  }
}

// Access rule functions
function openAccessRuleModal(rule?: RBACApi.AccessRule) {
  if (rule) {
    editingAccessRule.value = rule;
    Object.assign(accessRuleForm, {
      name: rule.name,
      description: rule.description,
      content_type: rule.content_type,
      scope: rule.scope,
      can_view: (rule as any).can_view ?? rule.can_read,
      can_add: (rule as any).can_add ?? rule.can_create,
      can_change: (rule as any).can_change ?? rule.can_update,
      can_delete: rule.can_delete,
      priority: (rule as any).priority ?? 0,
      is_active: rule.is_active,
    });
  } else {
    editingAccessRule.value = null;
    Object.assign(accessRuleForm, {
      name: '',
      description: '',
      content_type: undefined,
      scope: 'own',
      can_view: true,
      can_add: false,
      can_change: false,
      can_delete: false,
      priority: 0,
      is_active: true,
    });
  }
  showAccessRuleModal.value = true;
}

async function saveAccessRule() {
  if (!accessRuleForm.name || !accessRuleForm.content_type) {
    message.error('Name and Model are required');
    return;
  }

  savingAccessRule.value = true;
  try {
    const data = {
      ...accessRuleForm,
      user: userId.value,
      group: null,
    };

    if (editingAccessRule.value) {
      await updateAccessRuleApi(editingAccessRule.value.id, data);
      message.success('Access rule updated');
    } else {
      await createAccessRuleApi(data as RBACApi.AccessRuleCreate);
      message.success('Access rule created');
    }
    showAccessRuleModal.value = false;
    await fetchAccessRules();
  } catch (error: any) {
    console.error('Failed to save access rule:', error);
    message.error(error?.response?.data?.error || 'Failed to save access rule');
  } finally {
    savingAccessRule.value = false;
  }
}

async function deleteAccessRule(id: number) {
  try {
    await deleteAccessRuleApi(id);
    message.success('Access rule deleted');
    await fetchAccessRules();
  } catch (error: any) {
    console.error('Failed to delete access rule:', error);
    message.error(error?.response?.data?.error || 'Failed to delete access rule');
  }
}

function getInitials() {
  if (formState.full_name) {
    const parts = formState.full_name.split(' ');
    const first = parts[0]?.charAt(0) || '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) : '';
    return `${first}${last}`.toUpperCase() || 'U';
  }
  return formState.username?.charAt(0)?.toUpperCase() || 'U';
}

onMounted(() => {
  fetchPermissions();
  fetchMenuItems();
  fetchContentTypes();
  fetchUser();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <Space>
          <Button @click="handleBack">
            <template #icon>
              <ArrowLeftOutlined />
            </template>
            Back
          </Button>
          <h1 class="m-0 text-2xl font-bold">
            {{ isEditMode ? 'Edit User' : 'Create User' }}
          </h1>
        </Space>
        <Space>
          <Button @click="handleCancel">Cancel</Button>
          <Button type="primary" :loading="submitting" @click="handleSubmit">
            <template #icon>
              <SaveOutlined />
            </template>
            {{ isEditMode ? 'Update' : 'Create' }}
          </Button>
        </Space>
      </div>

      <Spin :spinning="loading">
        <Row :gutter="24">
          <!-- User Info Card -->
          <Col :xs="24" :lg="6">
            <Card class="mb-6 text-center">
              <div class="mb-4">
                <Avatar :size="100" :style="{ backgroundColor: '#1890ff', fontSize: '36px' }">
                  {{ getInitials() }}
                </Avatar>
              </div>
              <h3 class="mb-1 text-lg font-semibold">
                {{ formState.full_name || formState.username || 'New User' }}
              </h3>
              <p class="text-gray-500">{{ formState.email || 'No email' }}</p>

              <div class="mt-4 space-y-2">
                <div>
                  <Tag v-if="formState.is_active" color="green">
                    <CheckCircleOutlined class="mr-1" />
                    Active
                  </Tag>
                  <Tag v-else color="red">
                    <CloseCircleOutlined class="mr-1" />
                    Inactive
                  </Tag>
                </div>
                <div v-if="userDetails?.is_superuser">
                  <Tag color="gold">
                    <CrownOutlined class="mr-1" />
                    Superuser
                  </Tag>
                </div>
              </div>

              <div class="mt-4 border-t pt-4">
                <div class="flex justify-center gap-2">
                  <Tag color="purple">
                    <TeamOutlined class="mr-1" />
                    {{ companyRoles.length }} roles
                  </Tag>
                </div>
                <div v-if="isEditMode" class="mt-2 flex justify-center gap-2">
                  <Tag color="green">
                    <KeyOutlined class="mr-1" />
                    {{ selectedMenuCodes.length }} menus
                  </Tag>
                  <Tag color="orange">
                    <LockOutlined class="mr-1" />
                    {{ userAccessRules.length }} rules
                  </Tag>
                </div>
              </div>
            </Card>
          </Col>

          <!-- Tabs -->
          <Col :xs="24" :lg="18">
            <Card>
              <Tabs v-model:activeKey="activeTab">
                <!-- General Tab -->
                <Tabs.TabPane key="general" tab="General">
                  <Form ref="formRef" :model="formState" :rules="rules" layout="vertical">
                    <Row :gutter="16">
                      <Col :xs="24" :md="12">
                        <Form.Item label="Username" name="username">
                          <Input
                            v-model:value="formState.username"
                            placeholder="Enter username"
                            :disabled="isEditMode"
                          />
                        </Form.Item>
                      </Col>
                      <Col :xs="24" :md="12">
                        <Form.Item label="Email" name="email">
                          <Input
                            v-model:value="formState.email"
                            type="email"
                            placeholder="Enter email"
                          />
                        </Form.Item>
                      </Col>
                      <Col :xs="24" :md="12">
                        <Form.Item label="Full Name" name="full_name">
                          <Input
                            v-model:value="formState.full_name"
                            placeholder="Enter full name"
                          />
                        </Form.Item>
                      </Col>
                      <Col :xs="24" :md="12">
                        <Form.Item label="Phone" name="phone">
                          <Input
                            v-model:value="formState.phone"
                            placeholder="Enter phone number"
                          />
                        </Form.Item>
                      </Col>
                      <Col v-if="isCreateMode" :xs="24" :md="12">
                        <Form.Item
                          label="Password"
                          name="password"
                          :rules="rules.password"
                        >
                          <Input.Password
                            v-model:value="formState.password"
                            placeholder="Enter password (min 8 chars, 1 uppercase, 1 lowercase, 1 digit)"
                          />
                        </Form.Item>
                      </Col>
                      <Col v-if="isCreateMode" :xs="24" :md="12">
                        <Form.Item
                          label="Confirm Password"
                          name="confirm_password"
                          :rules="rules.confirm_password"
                        >
                          <Input.Password
                            v-model:value="formState.confirm_password"
                            placeholder="Confirm password"
                          />
                        </Form.Item>
                      </Col>
                      <Col :xs="24" :md="12">
                        <Form.Item label="Active" name="is_active">
                          <Switch v-model:checked="formState.is_active" />
                          <span class="ml-2 text-gray-500">
                            {{ formState.is_active ? 'User can log in' : 'User cannot log in' }}
                          </span>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Tabs.TabPane>

                <!-- Company Roles Tab -->
                <Tabs.TabPane v-if="isEditMode" key="roles" tab="Company Roles">
                  <div class="mb-4">
                    <h3 class="m-0 text-lg font-semibold">Company Roles</h3>
                    <p class="mt-1 text-sm text-gray-500">
                      User's roles in different companies. Manage roles from the Companies section.
                    </p>
                  </div>

                  <div v-if="companyRoles.length > 0" class="space-y-3">
                    <div
                      v-for="role in companyRoles"
                      :key="`${role.company_id}-${role.role_id}`"
                      class="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div class="flex items-center gap-3">
                        <Avatar :size="40" :style="{ backgroundColor: role.is_default ? '#52c41a' : '#1890ff' }">
                          {{ role.company_name?.charAt(0) || 'C' }}
                        </Avatar>
                        <div>
                          <div class="font-medium">{{ role.company_name }}</div>
                          <div class="text-sm text-gray-500">{{ role.company_code }}</div>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <Tag color="purple">{{ role.role_name }}</Tag>
                        <Tag v-if="role.is_default" color="green">Default</Tag>
                      </div>
                    </div>
                  </div>
                  <div v-else class="py-8 text-center text-gray-400">
                    <TeamOutlined class="mb-2 text-4xl" />
                    <p>No company roles assigned</p>
                  </div>
                </Tabs.TabPane>

                <!-- Menu Access Tab (Only in Edit Mode) -->
                <Tabs.TabPane v-if="isEditMode" key="menu-access" tab="Menu Access">
                  <div class="mb-4 flex items-center justify-between">
                    <div>
                      <h3 class="m-0 text-lg font-semibold">Menu Permissions</h3>
                      <p class="mt-1 text-sm text-gray-500">
                        Select which menus this user can access (in addition to group permissions)
                      </p>
                    </div>
                    <Button type="primary" :loading="savingMenuPerms" @click="saveMenuPermissions">
                      <template #icon><SaveOutlined /></template>
                      Save Menu Permissions
                    </Button>
                  </div>

                  <Spin :spinning="loadingMenus">
                    <div class="rounded border p-4">
                      <Tree
                        v-if="menuItems.length > 0"
                        v-model:checkedKeys="selectedMenuCodes"
                        :tree-data="convertToTreeData(menuItems)"
                        checkable
                        default-expand-all
                        :selectable="false"
                      >
                        <template #title="{ title }">
                          <span>{{ title }}</span>
                        </template>
                      </Tree>
                      <div v-else class="py-8 text-center text-gray-400">
                        <KeyOutlined class="mb-2 text-4xl" />
                        <p>No menu items available</p>
                      </div>
                    </div>
                    <div class="mt-3 text-sm text-gray-500">
                      {{ selectedMenuCodes.length }} menu item(s) selected
                    </div>
                  </Spin>
                </Tabs.TabPane>

                <!-- Permissions Tab -->
                <Tabs.TabPane key="permissions" tab="Permissions">
                  <div class="mb-4">
                    <h3 class="m-0 text-lg font-semibold">Direct Permissions</h3>
                    <p class="mt-1 text-sm text-gray-500">
                      Assign specific Django model permissions directly to this user
                    </p>
                  </div>

                  <Spin :spinning="loadingPermissions">
                    <div class="max-h-[500px] overflow-y-auto rounded border p-3">
                      <Collapse v-if="Object.keys(groupedPermissions).length > 0">
                        <Collapse.Panel
                          v-for="(perms, permGroupName) in groupedPermissions"
                          :key="permGroupName"
                          :header="formatGroupName(String(permGroupName))"
                        >
                          <template #extra>
                            <Checkbox
                              :checked="isGroupFullySelected(perms)"
                              @click.stop
                              @change="selectAllInGroup(perms)"
                            >
                              Select All
                            </Checkbox>
                          </template>
                          <div class="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                            <div v-for="perm in perms" :key="perm.id" class="flex items-center">
                              <Checkbox
                                :checked="isPermissionSelected(perm.id)"
                                @change="togglePermission(perm.id)"
                              >
                                {{ perm.name }}
                              </Checkbox>
                            </div>
                          </div>
                        </Collapse.Panel>
                      </Collapse>
                      <div v-else class="py-8 text-center text-gray-400">
                        Loading permissions...
                      </div>
                    </div>
                    <div class="mt-2 text-sm text-gray-500">
                      {{ selectedPermissions.length }} permissions selected
                    </div>
                  </Spin>
                </Tabs.TabPane>

                <!-- Access Rules Tab (Only in Edit Mode) -->
                <Tabs.TabPane v-if="isEditMode" key="access-rules" tab="Access Rules">
                  <div class="mb-4 flex items-center justify-between">
                    <div>
                      <h3 class="m-0 text-lg font-semibold">Record-Level Access Rules</h3>
                      <p class="mt-1 text-sm text-gray-500">
                        Define which records this user can access based on scope
                      </p>
                    </div>
                    <Button type="primary" @click="openAccessRuleModal()">
                      <template #icon><PlusOutlined /></template>
                      Add Access Rule
                    </Button>
                  </div>

                  <Table
                    :columns="accessRuleColumns"
                    :data-source="userAccessRules"
                    :loading="loadingAccessRules"
                    :pagination="{ pageSize: 10 }"
                    row-key="id"
                  >
                    <template #bodyCell="{ column, record }">
                      <template v-if="column.key === 'permissions'">
                        <Space>
                          <Tag v-if="record.can_view" color="blue">View</Tag>
                          <Tag v-if="record.can_add" color="green">Add</Tag>
                          <Tag v-if="record.can_change" color="orange">Change</Tag>
                          <Tag v-if="record.can_delete" color="red">Delete</Tag>
                        </Space>
                      </template>

                      <template v-if="column.key === 'scope'">
                        <Tag>{{ scopeLabels[record.scope] || record.scope }}</Tag>
                      </template>

                      <template v-if="column.key === 'status'">
                        <Tag :color="record.is_active ? 'green' : 'red'">
                          {{ record.is_active ? 'Active' : 'Inactive' }}
                        </Tag>
                      </template>

                      <template v-if="column.key === 'actions'">
                        <Space>
                          <Button type="link" size="small" @click="openAccessRuleModal(record as RBACApi.AccessRule)">
                            <template #icon><EditOutlined /></template>
                          </Button>
                          <Popconfirm
                            title="Delete this access rule?"
                            ok-text="Yes"
                            cancel-text="No"
                            @confirm="deleteAccessRule(record.id)"
                          >
                            <Button type="link" danger size="small">
                              <template #icon><DeleteOutlined /></template>
                            </Button>
                          </Popconfirm>
                        </Space>
                      </template>
                    </template>

                    <template #emptyText>
                      <div class="py-8 text-center">
                        <LockOutlined class="mb-2 text-4xl text-gray-300" />
                        <p class="text-gray-500">No access rules defined for this user</p>
                        <Button type="primary" class="mt-2" @click="openAccessRuleModal()">
                          <template #icon><PlusOutlined /></template>
                          Add First Rule
                        </Button>
                      </div>
                    </template>
                  </Table>
                </Tabs.TabPane>

                <!-- Security Tab (Only in Edit Mode) -->
                <Tabs.TabPane v-if="isEditMode" key="security" tab="Security">
                  <Spin :spinning="loadingSecuritySettings">
                    <!-- Security Score -->
                    <Card class="mb-4" size="small">
                      <Row :gutter="16" align="middle">
                        <Col :span="6" class="text-center">
                          <Progress
                            type="circle"
                            :percent="securityScore?.overall_score || 0"
                            :stroke-color="getSecurityScoreColor(securityScore?.overall_score)"
                            :size="80"
                          />
                          <div class="mt-2 font-medium">Security Score</div>
                        </Col>
                        <Col :span="18">
                          <Row :gutter="[8, 8]">
                            <Col :span="12">
                              <div class="text-xs text-gray-500">2FA Score</div>
                              <Progress
                                :percent="securityScore?.two_factor_score || 0"
                                :stroke-color="getSecurityScoreColor(securityScore?.two_factor_score)"
                                :show-info="false"
                                size="small"
                              />
                            </Col>
                            <Col :span="12">
                              <div class="text-xs text-gray-500">Password Score</div>
                              <Progress
                                :percent="securityScore?.password_score || 0"
                                :stroke-color="getSecurityScoreColor(securityScore?.password_score)"
                                :show-info="false"
                                size="small"
                              />
                            </Col>
                            <Col :span="12">
                              <div class="text-xs text-gray-500">Session Score</div>
                              <Progress
                                :percent="securityScore?.session_score || 0"
                                :stroke-color="getSecurityScoreColor(securityScore?.session_score)"
                                :show-info="false"
                                size="small"
                              />
                            </Col>
                            <Col :span="12">
                              <div class="text-xs text-gray-500">Activity Score</div>
                              <Progress
                                :percent="securityScore?.activity_score || 0"
                                :stroke-color="getSecurityScoreColor(securityScore?.activity_score)"
                                :show-info="false"
                                size="small"
                              />
                            </Col>
                          </Row>
                          <div v-if="securityScore?.risk_factors?.length" class="mt-2">
                            <Tag v-for="factor in securityScore.risk_factors" :key="factor" color="orange">
                              {{ factor }}
                            </Tag>
                          </div>
                        </Col>
                      </Row>
                    </Card>

                    <!-- Account Status Alert -->
                    <Alert
                      v-if="securitySettings?.admin_locked"
                      type="error"
                      :message="`Account Locked: ${securitySettings.admin_lock_reason || 'No reason specified'}`"
                      show-icon
                      class="mb-4"
                    />

                    <!-- Quick Actions -->
                    <Card title="Quick Actions" class="mb-4" size="small">
                      <Space wrap>
                        <Button
                          v-if="!securitySettings?.admin_locked"
                          danger
                          @click="showLockAccountModal = true"
                        >
                          <template #icon><LockOutlined /></template>
                          Lock Account
                        </Button>
                        <Button
                          v-else
                          type="primary"
                          :loading="securityActionLoading"
                          @click="handleUnlockAccount"
                        >
                          <template #icon><UnlockOutlined /></template>
                          Unlock Account
                        </Button>
                        <Button :loading="securityActionLoading" @click="handleForce2FA">
                          <template #icon><SafetyCertificateOutlined /></template>
                          Force 2FA
                        </Button>
                        <Button
                          v-if="userDetails?.two_factor_enabled"
                          @click="showReset2FAModal = true"
                        >
                          <template #icon><ExclamationCircleOutlined /></template>
                          Reset 2FA
                        </Button>
                        <Button danger :loading="securityActionLoading" @click="handleTerminateSessions">
                          <template #icon><CloseCircleOutlined /></template>
                          Terminate Sessions
                        </Button>
                      </Space>
                    </Card>

                    <!-- Security Settings Form -->
                    <Form layout="vertical">
                      <!-- Two-Factor Authentication -->
                      <Card title="Two-Factor Authentication" class="mb-4" size="small">
                        <Row :gutter="16">
                          <Col :span="12">
                            <Form.Item label="Require 2FA">
                              <Switch v-model:checked="securityFormState.two_factor_required" />
                              <span class="ml-2 text-xs text-gray-500">User must enable 2FA on next login</span>
                            </Form.Item>
                          </Col>
                          <Col :span="12">
                            <Form.Item label="Allowed 2FA Methods">
                              <Checkbox.Group v-model:value="securityFormState.two_factor_methods">
                                <Checkbox value="totp">Authenticator App</Checkbox>
                                <Checkbox value="sms">SMS</Checkbox>
                                <Checkbox value="email">Email</Checkbox>
                              </Checkbox.Group>
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>

                      <!-- API & Session Settings -->
                      <Card title="API & Session Settings" class="mb-4" size="small">
                        <Row :gutter="16">
                          <Col :span="8">
                            <Form.Item label="API Access Enabled">
                              <Switch v-model:checked="securityFormState.api_access_enabled" />
                            </Form.Item>
                          </Col>
                          <Col :span="8">
                            <Form.Item label="API Key Enabled">
                              <Switch v-model:checked="securityFormState.api_key_enabled" />
                            </Form.Item>
                          </Col>
                          <Col :span="8">
                            <Form.Item label="Session IP Binding">
                              <Switch v-model:checked="securityFormState.require_session_ip_binding" />
                            </Form.Item>
                          </Col>
                          <Col :span="8">
                            <Form.Item label="Rate Limit (per hour)">
                              <InputNumber
                                v-model:value="securityFormState.api_rate_limit_per_hour"
                                :min="10"
                                :max="100000"
                                style="width: 100%"
                              />
                            </Form.Item>
                          </Col>
                          <Col :span="8">
                            <Form.Item label="Max Concurrent Sessions">
                              <InputNumber
                                v-model:value="securityFormState.max_concurrent_sessions"
                                :min="1"
                                :max="50"
                                style="width: 100%"
                              />
                            </Form.Item>
                          </Col>
                          <Col :span="8">
                            <Form.Item label="Session Timeout (minutes)">
                              <InputNumber
                                v-model:value="securityFormState.session_timeout_minutes"
                                :min="5"
                                :max="10080"
                                style="width: 100%"
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>

                      <!-- Login & Password Settings -->
                      <Card title="Login & Password Settings" class="mb-4" size="small">
                        <Row :gutter="16">
                          <Col :span="8">
                            <Form.Item label="Max Failed Attempts">
                              <InputNumber
                                v-model:value="securityFormState.max_failed_login_attempts"
                                :min="1"
                                :max="20"
                                style="width: 100%"
                              />
                            </Form.Item>
                          </Col>
                          <Col :span="8">
                            <Form.Item label="Lockout Duration (min)">
                              <InputNumber
                                v-model:value="securityFormState.lockout_duration_minutes"
                                :min="1"
                                :max="1440"
                                style="width: 100%"
                              />
                            </Form.Item>
                          </Col>
                          <Col :span="8">
                            <Form.Item label="Password Expiry (days)">
                              <InputNumber
                                v-model:value="securityFormState.password_expires_days"
                                :min="0"
                                :max="365"
                                style="width: 100%"
                              />
                              <div class="text-xs text-gray-500">0 = never expires</div>
                            </Form.Item>
                          </Col>
                          <Col :span="8">
                            <Form.Item label="Min Password Length">
                              <InputNumber
                                v-model:value="securityFormState.password_min_length"
                                :min="6"
                                :max="128"
                                style="width: 100%"
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Divider>Password Requirements</Divider>
                        <Space>
                          <Checkbox v-model:checked="securityFormState.password_require_uppercase">Uppercase</Checkbox>
                          <Checkbox v-model:checked="securityFormState.password_require_lowercase">Lowercase</Checkbox>
                          <Checkbox v-model:checked="securityFormState.password_require_numbers">Numbers</Checkbox>
                          <Checkbox v-model:checked="securityFormState.password_require_special">Special Chars</Checkbox>
                        </Space>
                      </Card>

                      <!-- Notifications -->
                      <Card title="Security Notifications" class="mb-4" size="small">
                        <Row :gutter="16">
                          <Col :span="8">
                            <Checkbox v-model:checked="securityFormState.notify_on_login">Email on Login</Checkbox>
                          </Col>
                          <Col :span="8">
                            <Checkbox v-model:checked="securityFormState.notify_on_failed_login">Email on Failed Login</Checkbox>
                          </Col>
                          <Col :span="8">
                            <Checkbox v-model:checked="securityFormState.notify_on_password_change">Email on Password Change</Checkbox>
                          </Col>
                          <Col :span="8">
                            <Checkbox v-model:checked="securityFormState.notify_on_2fa_change">Email on 2FA Change</Checkbox>
                          </Col>
                          <Col :span="8">
                            <Checkbox v-model:checked="securityFormState.notify_on_new_device">Email on New Device</Checkbox>
                          </Col>
                          <Col :span="8">
                            <Checkbox v-model:checked="securityFormState.activity_logging_enabled">Activity Logging</Checkbox>
                          </Col>
                        </Row>
                      </Card>

                      <!-- Admin Controls -->
                      <Card title="Admin Controls" class="mb-4" size="small">
                        <Row :gutter="16">
                          <Col :span="12">
                            <Form.Item label="Lock User Settings">
                              <Switch v-model:checked="securityFormState.settings_locked" />
                              <span class="ml-2 text-xs text-gray-500">Prevent user from modifying their own settings</span>
                            </Form.Item>
                          </Col>
                          <Col :span="24">
                            <Form.Item label="Admin Notes">
                              <Input.TextArea
                                v-model:value="securityFormState.admin_notes"
                                :rows="3"
                                placeholder="Internal notes about this user's security..."
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>

                      <!-- Save Button -->
                      <div class="flex justify-end">
                        <Button type="primary" :loading="savingSecuritySettings" @click="saveSecuritySettings">
                          <template #icon><SaveOutlined /></template>
                          Save Security Settings
                        </Button>
                      </div>
                    </Form>
                  </Spin>
                </Tabs.TabPane>
              </Tabs>
            </Card>
          </Col>
        </Row>

        <!-- Form Actions -->
        <div class="mt-6 flex justify-end gap-4">
          <Button size="large" @click="handleCancel">Cancel</Button>
          <Button type="primary" size="large" :loading="submitting" @click="handleSubmit">
            <template #icon>
              <SaveOutlined />
            </template>
            {{ isEditMode ? 'Update User' : 'Create User' }}
          </Button>
        </div>

        <!-- Activity Thread (only in edit mode) -->
        <div v-if="isEditMode && userId" class="mt-6">
          <Card title="Activity & Messages">
            <ActivityThread
              model-name="users"
              :record-id="userId"
              :show-messages="true"
              :show-activities="true"
              :access-token="accessStore.accessToken || ''"
              max-height="400px"
            />
          </Card>
        </div>
      </Spin>

      <!-- Access Rule Modal -->
      <Modal
        v-model:open="showAccessRuleModal"
        :title="editingAccessRule ? 'Edit Access Rule' : 'Create Access Rule'"
        :confirm-loading="savingAccessRule"
        @ok="saveAccessRule"
        @cancel="showAccessRuleModal = false"
      >
        <Form layout="vertical">
          <Form.Item label="Rule Name" required>
            <Input v-model:value="accessRuleForm.name" placeholder="e.g., View Own Department Employees" />
          </Form.Item>

          <Form.Item label="Description">
            <Input.TextArea v-model:value="accessRuleForm.description" :rows="2" placeholder="Describe what this rule does" />
          </Form.Item>

          <Form.Item label="Model (Content Type)" required>
            <Select
              v-model:value="accessRuleForm.content_type"
              placeholder="Select model..."
              show-search
              :filter-option="(input: string, option: any) => option.label?.toLowerCase().includes(input.toLowerCase())"
              :options="contentTypes.map(ct => ({ label: `${ct.app_label}.${ct.model}`, value: ct.id }))"
            />
          </Form.Item>

          <Form.Item label="Scope">
            <Select v-model:value="accessRuleForm.scope">
              <Select.Option value="own">Own Records Only</Select.Option>
              <Select.Option value="department">Same Department</Select.Option>
              <Select.Option value="company">Same Company</Select.Option>
              <Select.Option value="all">All Records</Select.Option>
              <Select.Option value="custom">Custom Filter</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Permissions">
            <div class="flex flex-wrap gap-4">
              <Checkbox v-model:checked="accessRuleForm.can_view">View</Checkbox>
              <Checkbox v-model:checked="accessRuleForm.can_add">Add</Checkbox>
              <Checkbox v-model:checked="accessRuleForm.can_change">Change</Checkbox>
              <Checkbox v-model:checked="accessRuleForm.can_delete">Delete</Checkbox>
            </div>
          </Form.Item>

          <Row :gutter="16">
            <Col :span="12">
              <Form.Item label="Priority">
                <Input v-model:value="accessRuleForm.priority" type="number" />
              </Form.Item>
            </Col>
            <Col :span="12">
              <Form.Item label="Active">
                <Switch v-model:checked="accessRuleForm.is_active" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <!-- Lock Account Modal -->
      <Modal
        v-model:open="showLockAccountModal"
        title="Lock User Account"
        :confirm-loading="securityActionLoading"
        @ok="handleLockAccount"
        @cancel="showLockAccountModal = false"
      >
        <Alert
          type="warning"
          message="This will immediately terminate all user sessions and prevent login."
          show-icon
          class="mb-4"
        />
        <Form layout="vertical">
          <Form.Item label="Reason" required>
            <Input.TextArea
              v-model:value="lockReason"
              :rows="3"
              placeholder="Enter reason for locking this account..."
            />
          </Form.Item>
        </Form>
      </Modal>

      <!-- Reset 2FA Modal -->
      <Modal
        v-model:open="showReset2FAModal"
        title="Reset Two-Factor Authentication"
        :confirm-loading="securityActionLoading"
        @ok="handleReset2FA"
        @cancel="showReset2FAModal = false"
      >
        <Alert
          type="warning"
          message="This will disable 2FA for the user. They will need to set it up again."
          show-icon
          class="mb-4"
        />
        <Form layout="vertical">
          <Form.Item label="Reason" required>
            <Input.TextArea
              v-model:value="reset2FAReason"
              :rows="3"
              placeholder="Enter reason for resetting 2FA..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  </Page>
</template>
