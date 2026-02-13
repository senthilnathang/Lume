<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  Descriptions,
  Divider,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  SelectOption,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Textarea,
  TimePicker,
  Tooltip,
  TabPane,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';

import { useNotification } from '#/composables';
import {
  getProfileApi,
  createProfileApi,
  updateProfileApi,
  getProfileObjectPermissionsApi,
  setProfileObjectPermissionApi,
  getProfileAssignedUsersApi,
  PROFILE_TYPES,
  getProfileTypeConfig,
} from '#/api/base_security';

defineOptions({
  name: 'ProfileForm',
});

const props = defineProps({
  profileId: {
    type: [String, Number],
    default: null,
  },
});

const emit = defineEmits(['back', 'saved']);

const { success: showSuccess, error: showError } = useNotification();

const isEditMode = computed(() => !!props.profileId);
const loading = ref(false);
const saving = ref(false);
const activeTab = ref('general');

// Profile data
const profile = ref(null);
const profileForm = reactive({
  name: '',
  api_name: '',
  description: '',
  profile_type: 'custom',
  login_hours_start: null,
  login_hours_end: null,
  login_ip_ranges: [],
  restrict_login_ip: false,
  session_timeout_minutes: 120,
  password_expires_days: 0,
  password_min_length: 8,
  password_complexity: 'medium',
  two_factor_required: false,
  api_access_enabled: true,
  api_rate_limit: 1000,
  visible_apps: [],
  is_active: true,
});

// Object permissions
const objectPermissions = ref([]);
const permissionsLoading = ref(false);
const permissionsSaving = ref(false);

// Assigned users
const assignedUsers = ref([]);
const usersLoading = ref(false);
const usersPagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
});

// IP range input
const newIpRange = ref('');

// Clone modal
const cloneModalVisible = ref(false);
const cloneForm = reactive({
  name: '',
  api_name: '',
});

const permissionColumns = [
  { title: 'Object', dataIndex: 'object_name', key: 'object_name', width: 200, fixed: 'left' },
  { title: 'Create', key: 'can_create', width: 80, align: 'center' },
  { title: 'Read', key: 'can_read', width: 80, align: 'center' },
  { title: 'Edit', key: 'can_edit', width: 80, align: 'center' },
  { title: 'Delete', key: 'can_delete', width: 80, align: 'center' },
  { title: 'View All', key: 'can_view_all', width: 100, align: 'center' },
  { title: 'Modify All', key: 'can_modify_all', width: 110, align: 'center' },
];

const userColumns = [
  { title: 'Name', dataIndex: 'full_name', key: 'full_name', width: 200 },
  { title: 'Email', dataIndex: 'email', key: 'email', width: 250 },
  { title: 'Username', dataIndex: 'username', key: 'username', width: 150 },
  { title: 'Status', key: 'status', width: 100, align: 'center' },
  { title: 'Last Login', dataIndex: 'last_login_at', key: 'last_login', width: 180 },
];

function goBack() {
  emit('back');
}

async function fetchProfile() {
  if (!props.profileId) return;

  loading.value = true;
  try {
    const data = await getProfileApi(props.profileId);
    profile.value = data;

    // Populate form
    Object.assign(profileForm, {
      name: data.name || '',
      api_name: data.api_name || '',
      description: data.description || '',
      profile_type: data.profile_type || 'custom',
      login_hours_start: data.login_hours_start || null,
      login_hours_end: data.login_hours_end || null,
      login_ip_ranges: data.login_ip_ranges || [],
      restrict_login_ip: data.restrict_login_ip || false,
      session_timeout_minutes: data.session_timeout_minutes || 120,
      password_expires_days: data.password_expires_days || 0,
      password_min_length: data.password_min_length || 8,
      password_complexity: data.password_complexity || 'medium',
      two_factor_required: data.two_factor_required || false,
      api_access_enabled: data.api_access_enabled !== false,
      api_rate_limit: data.api_rate_limit || 1000,
      visible_apps: data.visible_apps || [],
      is_active: data.is_active !== false,
    });
  } catch (err) {
    console.error('Failed to fetch profile:', err);
    showError('Failed to load profile');
  } finally {
    loading.value = false;
  }
}

async function fetchObjectPermissions() {
  if (!props.profileId) return;

  permissionsLoading.value = true;
  try {
    const data = await getProfileObjectPermissionsApi(props.profileId);
    objectPermissions.value = data || [];
  } catch (err) {
    console.error('Failed to fetch permissions:', err);
    showError('Failed to load object permissions');
    objectPermissions.value = [];
  } finally {
    permissionsLoading.value = false;
  }
}

async function fetchAssignedUsers() {
  if (!props.profileId) return;

  usersLoading.value = true;
  try {
    const data = await getProfileAssignedUsersApi(props.profileId, {
      page: usersPagination.value.current,
      page_size: usersPagination.value.pageSize,
    });
    assignedUsers.value = data.items || data || [];
    usersPagination.value.total = data.total || assignedUsers.value.length;
  } catch (err) {
    console.error('Failed to fetch assigned users:', err);
    assignedUsers.value = [];
  } finally {
    usersLoading.value = false;
  }
}

function generateApiName(name) {
  if (!isEditMode.value && name) {
    profileForm.api_name = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
}

async function handleSaveGeneral() {
  if (!profileForm.name.trim()) {
    showError('Profile name is required');
    return;
  }
  if (!profileForm.api_name.trim()) {
    showError('API name is required');
    return;
  }

  saving.value = true;
  try {
    if (isEditMode.value) {
      await updateProfileApi(props.profileId, profileForm);
      showSuccess('Profile updated successfully');
    } else {
      const created = await createProfileApi(profileForm);
      showSuccess('Profile created successfully');
      emit('saved', created);
    }
    await fetchProfile();
  } catch (err) {
    console.error('Failed to save profile:', err);
    showError(err.response?.data?.detail || 'Failed to save profile');
  } finally {
    saving.value = false;
  }
}

async function handlePermissionChange(record, field, value) {
  if (profile.value?.is_system) {
    showError('System profile permissions cannot be modified');
    return;
  }

  permissionsSaving.value = true;
  try {
    const updateData = {
      object_name: record.object_name,
      can_create: record.can_create,
      can_read: record.can_read,
      can_edit: record.can_edit,
      can_delete: record.can_delete,
      can_view_all: record.can_view_all,
      can_modify_all: record.can_modify_all,
      [field]: value,
    };
    await setProfileObjectPermissionApi(props.profileId, record.object_name, updateData);

    // Update local state
    const idx = objectPermissions.value.findIndex(p => p.object_name === record.object_name);
    if (idx >= 0) {
      objectPermissions.value[idx][field] = value;
    }
    showSuccess('Permission updated');
  } catch (err) {
    console.error('Failed to update permission:', err);
    showError(err.response?.data?.detail || 'Failed to update permission');
    await fetchObjectPermissions();
  } finally {
    permissionsSaving.value = false;
  }
}

function addIpRange() {
  if (newIpRange.value.trim()) {
    if (!profileForm.login_ip_ranges.includes(newIpRange.value.trim())) {
      profileForm.login_ip_ranges.push(newIpRange.value.trim());
    }
    newIpRange.value = '';
  }
}

function removeIpRange(ip) {
  profileForm.login_ip_ranges = profileForm.login_ip_ranges.filter(i => i !== ip);
}

function handleUsersTableChange(pag) {
  usersPagination.value.current = pag.current;
  usersPagination.value.pageSize = pag.pageSize;
  fetchAssignedUsers();
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

// Watch for tab changes to load data
watch(activeTab, (tab) => {
  if (tab === 'permissions' && objectPermissions.value.length === 0) {
    fetchObjectPermissions();
  } else if (tab === 'users' && assignedUsers.value.length === 0) {
    fetchAssignedUsers();
  }
});

onMounted(() => {
  if (props.profileId) {
    fetchProfile();
  }
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading">
      <!-- Header -->
      <Card class="header-card">
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button @click="goBack">
                <ArrowLeftOutlined /> Back
              </Button>
              <Divider type="vertical" />
              <Space>
                <UserOutlined style="font-size: 24px;" />
                <div>
                  <h2 style="margin: 0;">
                    {{ isEditMode ? profile?.name || 'Loading...' : 'New Profile' }}
                  </h2>
                  <div v-if="profile" style="color: #888; font-size: 12px;">
                    <Tag :color="getProfileTypeConfig(profile.profile_type).color">
                      {{ getProfileTypeConfig(profile.profile_type).label }}
                    </Tag>
                    <span v-if="profile.api_name">{{ profile.api_name }}</span>
                    <Tag v-if="profile.is_system" color="purple" style="margin-left: 8px;">System</Tag>
                  </div>
                </div>
              </Space>
            </Space>
          </Col>
          <Col v-if="isEditMode && profile">
            <Space>
              <Tag :color="profile.is_active ? 'success' : 'default'">
                {{ profile.is_active ? 'Active' : 'Inactive' }}
              </Tag>
            </Space>
          </Col>
        </Row>
      </Card>

      <!-- Tabs -->
      <Card style="margin-top: 16px;">
        <Tabs v-model:activeKey="activeTab">
          <!-- General Tab -->
          <TabPane key="general" tab="General">
            <template #tab>
              <Space><SettingOutlined /> General</Space>
            </template>

            <Form layout="vertical" style="max-width: 800px;">
              <Row :gutter="24">
                <Col :span="12">
                  <FormItem label="Profile Name" required>
                    <Input
                      v-model:value="profileForm.name"
                      placeholder="Enter profile name"
                      @input="generateApiName(profileForm.name)"
                      :disabled="profile?.is_system"
                    />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="API Name" required>
                    <Input
                      v-model:value="profileForm.api_name"
                      placeholder="api_name"
                      :disabled="isEditMode"
                    />
                    <div class="help-text">Unique identifier. Cannot be changed after creation.</div>
                  </FormItem>
                </Col>
              </Row>

              <FormItem label="Description">
                <Textarea
                  v-model:value="profileForm.description"
                  :rows="3"
                  placeholder="Describe the purpose of this profile..."
                  :disabled="profile?.is_system"
                />
              </FormItem>

              <Row :gutter="24">
                <Col :span="12">
                  <FormItem label="Profile Type">
                    <Select
                      v-model:value="profileForm.profile_type"
                      style="width: 100%"
                      :disabled="profile?.is_system"
                    >
                      <SelectOption v-for="t in PROFILE_TYPES" :key="t.value" :value="t.value">
                        {{ t.label }}
                      </SelectOption>
                    </Select>
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Status">
                    <Switch
                      v-model:checked="profileForm.is_active"
                      :disabled="profile?.is_system"
                    />
                    <span style="margin-left: 8px;">{{ profileForm.is_active ? 'Active' : 'Inactive' }}</span>
                  </FormItem>
                </Col>
              </Row>

              <Divider>Session Settings</Divider>

              <Row :gutter="24">
                <Col :span="12">
                  <FormItem label="Session Timeout (minutes)">
                    <InputNumber
                      v-model:value="profileForm.session_timeout_minutes"
                      :min="5"
                      :max="10080"
                      style="width: 100%"
                      :disabled="profile?.is_system"
                    />
                    <div class="help-text">5 min to 7 days (10080 min)</div>
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Login Hours">
                    <Space>
                      <Input
                        v-model:value="profileForm.login_hours_start"
                        placeholder="Start (HH:MM)"
                        style="width: 120px"
                        :disabled="profile?.is_system"
                      />
                      <span>to</span>
                      <Input
                        v-model:value="profileForm.login_hours_end"
                        placeholder="End (HH:MM)"
                        style="width: 120px"
                        :disabled="profile?.is_system"
                      />
                    </Space>
                  </FormItem>
                </Col>
              </Row>

              <Divider>IP Restrictions</Divider>

              <FormItem>
                <Checkbox
                  v-model:checked="profileForm.restrict_login_ip"
                  :disabled="profile?.is_system"
                >
                  Restrict Login by IP Address
                </Checkbox>
              </FormItem>

              <FormItem v-if="profileForm.restrict_login_ip" label="Allowed IP Ranges">
                <Space direction="vertical" style="width: 100%;">
                  <Space>
                    <Input
                      v-model:value="newIpRange"
                      placeholder="e.g., 192.168.1.0/24 or 10.0.0.1"
                      style="width: 250px"
                      @keyup.enter="addIpRange"
                      :disabled="profile?.is_system"
                    />
                    <Button @click="addIpRange" :disabled="profile?.is_system">
                      <PlusOutlined /> Add
                    </Button>
                  </Space>
                  <div class="ip-tags">
                    <Tag
                      v-for="ip in profileForm.login_ip_ranges"
                      :key="ip"
                      closable
                      @close="removeIpRange(ip)"
                    >
                      {{ ip }}
                    </Tag>
                    <span v-if="profileForm.login_ip_ranges.length === 0" class="help-text">
                      No IP ranges configured
                    </span>
                  </div>
                </Space>
              </FormItem>

              <Divider>Security Settings</Divider>

              <Row :gutter="24">
                <Col :span="8">
                  <FormItem label="Password Expiry (days)">
                    <InputNumber
                      v-model:value="profileForm.password_expires_days"
                      :min="0"
                      :max="365"
                      style="width: 100%"
                      :disabled="profile?.is_system"
                    />
                    <div class="help-text">0 = never expires</div>
                  </FormItem>
                </Col>
                <Col :span="8">
                  <FormItem label="Min Password Length">
                    <InputNumber
                      v-model:value="profileForm.password_min_length"
                      :min="6"
                      :max="128"
                      style="width: 100%"
                      :disabled="profile?.is_system"
                    />
                  </FormItem>
                </Col>
                <Col :span="8">
                  <FormItem label="Two-Factor Required">
                    <Switch
                      v-model:checked="profileForm.two_factor_required"
                      :disabled="profile?.is_system"
                    />
                  </FormItem>
                </Col>
              </Row>

              <Divider>API Access</Divider>

              <Row :gutter="24">
                <Col :span="12">
                  <FormItem label="API Access">
                    <Switch
                      v-model:checked="profileForm.api_access_enabled"
                      :disabled="profile?.is_system"
                    />
                    <span style="margin-left: 8px;">
                      {{ profileForm.api_access_enabled ? 'Enabled' : 'Disabled' }}
                    </span>
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem v-if="profileForm.api_access_enabled" label="API Rate Limit (req/hour)">
                    <InputNumber
                      v-model:value="profileForm.api_rate_limit"
                      :min="10"
                      :max="100000"
                      style="width: 100%"
                      :disabled="profile?.is_system"
                    />
                  </FormItem>
                </Col>
              </Row>

              <Divider />

              <FormItem>
                <Button
                  type="primary"
                  @click="handleSaveGeneral"
                  :loading="saving"
                  :disabled="profile?.is_system"
                >
                  <SaveOutlined /> Save Changes
                </Button>
                <span v-if="profile?.is_system" style="margin-left: 16px; color: #999;">
                  System profiles cannot be modified
                </span>
              </FormItem>
            </Form>
          </TabPane>

          <!-- Object Permissions Tab -->
          <TabPane key="permissions" tab="Object Permissions" :disabled="!isEditMode">
            <template #tab>
              <Space><KeyOutlined /> Object Permissions</Space>
            </template>

            <Alert
              v-if="profile?.is_system"
              type="warning"
              message="System profile permissions are read-only"
              style="margin-bottom: 16px;"
              show-icon
            />

            <Spin :spinning="permissionsLoading || permissionsSaving">
              <div style="margin-bottom: 16px;">
                <Button @click="fetchObjectPermissions">
                  <ReloadOutlined /> Refresh
                </Button>
              </div>

              <Table
                :columns="permissionColumns"
                :data-source="objectPermissions"
                :pagination="{ pageSize: 20, showSizeChanger: true }"
                :scroll="{ x: 800, y: 500 }"
                row-key="object_name"
                size="middle"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'can_create'">
                    <Checkbox
                      :checked="record.can_create"
                      @change="e => handlePermissionChange(record, 'can_create', e.target.checked)"
                      :disabled="profile?.is_system"
                    />
                  </template>
                  <template v-if="column.key === 'can_read'">
                    <Checkbox
                      :checked="record.can_read"
                      @change="e => handlePermissionChange(record, 'can_read', e.target.checked)"
                      :disabled="profile?.is_system"
                    />
                  </template>
                  <template v-if="column.key === 'can_edit'">
                    <Checkbox
                      :checked="record.can_edit"
                      @change="e => handlePermissionChange(record, 'can_edit', e.target.checked)"
                      :disabled="profile?.is_system"
                    />
                  </template>
                  <template v-if="column.key === 'can_delete'">
                    <Checkbox
                      :checked="record.can_delete"
                      @change="e => handlePermissionChange(record, 'can_delete', e.target.checked)"
                      :disabled="profile?.is_system"
                    />
                  </template>
                  <template v-if="column.key === 'can_view_all'">
                    <Checkbox
                      :checked="record.can_view_all"
                      @change="e => handlePermissionChange(record, 'can_view_all', e.target.checked)"
                      :disabled="profile?.is_system"
                    />
                  </template>
                  <template v-if="column.key === 'can_modify_all'">
                    <Checkbox
                      :checked="record.can_modify_all"
                      @change="e => handlePermissionChange(record, 'can_modify_all', e.target.checked)"
                      :disabled="profile?.is_system"
                    />
                  </template>
                </template>
              </Table>
            </Spin>
          </TabPane>

          <!-- Assigned Users Tab -->
          <TabPane key="users" tab="Assigned Users" :disabled="!isEditMode">
            <template #tab>
              <Space><TeamOutlined /> Assigned Users</Space>
            </template>

            <Spin :spinning="usersLoading">
              <div style="margin-bottom: 16px;">
                <Space>
                  <Button @click="fetchAssignedUsers">
                    <ReloadOutlined /> Refresh
                  </Button>
                  <span class="help-text">
                    {{ usersPagination.total }} user(s) assigned to this profile
                  </span>
                </Space>
              </div>

              <Table
                :columns="userColumns"
                :data-source="assignedUsers"
                :pagination="{
                  current: usersPagination.current,
                  pageSize: usersPagination.pageSize,
                  total: usersPagination.total,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} users`,
                }"
                :scroll="{ x: 900 }"
                row-key="id"
                @change="handleUsersTableChange"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'status'">
                    <Tag :color="record.is_active ? 'success' : 'default'">
                      {{ record.is_active ? 'Active' : 'Inactive' }}
                    </Tag>
                  </template>
                  <template v-if="column.key === 'last_login'">
                    {{ formatDate(record.last_login_at) }}
                  </template>
                </template>
              </Table>
            </Spin>
          </TabPane>
        </Tabs>
      </Card>
    </Spin>
  </Page>
</template>

<style scoped>
.header-card {
  margin-bottom: 0;
}

.header-card h2 {
  font-size: 20px;
  font-weight: 600;
}

.help-text {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}

.ip-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 32px;
  align-items: center;
}

:deep(.ant-tabs-nav) {
  margin-bottom: 24px;
}

:deep(.ant-divider-horizontal) {
  margin: 24px 0 16px;
}

:deep(.ant-divider-inner-text) {
  font-weight: 600;
  font-size: 14px;
  color: #666;
}
</style>
