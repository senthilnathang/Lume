<template>
  <div class="security-policy-templates">
    <!-- ==================== FORM VIEW ==================== -->
    <div v-if="currentView === 'form'" class="form-view">
      <!-- Form Header -->
      <div class="form-header">
        <div class="form-header-content">
          <div class="form-header-left">
            <Button type="text" class="back-btn" @click="backToList">
              <ArrowLeftOutlined />
            </Button>
            <div>
              <h2 class="form-title">
                {{ selectedTemplateId ? 'Edit Security Policy Template' : 'Create Security Policy Template' }}
              </h2>
              <p class="form-subtitle">
                {{ selectedTemplateId ? 'Modify the template configuration below' : 'Define a new reusable security configuration' }}
              </p>
            </div>
          </div>
          <div class="form-header-right">
            <Space>
              <Button @click="backToList">Cancel</Button>
              <Button type="primary" :loading="saving" @click="saveTemplate">
                <template #icon><SaveOutlined /></template>
                {{ selectedTemplateId ? 'Update Template' : 'Create Template' }}
              </Button>
            </Space>
          </div>
        </div>
      </div>

      <!-- Form Body: Two Column Layout -->
      <Row :gutter="24" class="form-body">
        <!-- Sidebar -->
        <Col :xs="24" :lg="8">
          <Card class="form-sidebar-card">
            <h3 class="sidebar-section-title">Basic Information</h3>
            <Form layout="vertical">
              <FormItem label="Template Name" required>
                <Input v-model:value="formData.name" placeholder="e.g., Strict Security" />
              </FormItem>
              <FormItem label="Code" required>
                <Input
                  v-model:value="formData.code"
                  placeholder="e.g., strict_security"
                  :disabled="!!selectedTemplateId"
                />
              </FormItem>
              <FormItem label="Description">
                <Textarea v-model:value="formData.description" :rows="3" placeholder="Describe this template..." />
              </FormItem>
              <FormItem label="Priority">
                <InputNumber v-model:value="formData.priority" :min="0" :max="100" style="width: 100%" />
              </FormItem>
              <Divider />
              <FormItem label="Status">
                <div class="switch-row">
                  <Switch v-model:checked="formData.is_active" />
                  <Tag :color="formData.is_active ? 'green' : 'default'" style="margin-left: 8px">
                    {{ formData.is_active ? 'Active' : 'Inactive' }}
                  </Tag>
                </div>
              </FormItem>
              <FormItem label="Apply to New Users">
                <Switch v-model:checked="formData.apply_to_new_users" />
              </FormItem>
            </Form>
          </Card>
        </Col>

        <!-- Main Tabbed Form -->
        <Col :xs="24" :lg="16">
          <Card class="form-main-card">
            <h3 class="sidebar-section-title">Security Settings</h3>
            <Tabs v-model:activeKey="activeSettingsTab">
              <!-- 2FA Tab -->
              <TabPane key="2fa" tab="Two-Factor Auth">
                <div class="tab-content">
                  <Row :gutter="16">
                    <Col :span="12">
                      <FormItem label="Require 2FA">
                        <Switch v-model:checked="formData.settings.two_factor_required" />
                      </FormItem>
                    </Col>
                    <Col :span="12">
                      <FormItem label="Allowed Methods">
                        <Select
                          v-model:value="formData.settings.two_factor_methods"
                          mode="multiple"
                          placeholder="Select methods"
                          style="width: 100%"
                        >
                          <SelectOption value="totp">Authenticator App</SelectOption>
                          <SelectOption value="sms">SMS</SelectOption>
                          <SelectOption value="email">Email</SelectOption>
                        </Select>
                      </FormItem>
                    </Col>
                  </Row>
                </div>
              </TabPane>

              <!-- API Tab -->
              <TabPane key="api" tab="API Access">
                <div class="tab-content">
                  <Row :gutter="16">
                    <Col :span="8">
                      <FormItem label="API Access">
                        <Switch v-model:checked="formData.settings.api_access_enabled" />
                      </FormItem>
                    </Col>
                    <Col :span="8">
                      <FormItem label="Rate Limit/Hour">
                        <InputNumber v-model:value="formData.settings.api_rate_limit_per_hour" :min="0" style="width: 100%" />
                      </FormItem>
                    </Col>
                    <Col :span="8">
                      <FormItem label="Rate Limit/Minute">
                        <InputNumber v-model:value="formData.settings.api_rate_limit_per_minute" :min="0" style="width: 100%" />
                      </FormItem>
                    </Col>
                  </Row>
                </div>
              </TabPane>

              <!-- Sessions Tab -->
              <TabPane key="sessions" tab="Sessions">
                <div class="tab-content">
                  <Row :gutter="16">
                    <Col :span="8">
                      <FormItem label="Max Concurrent Sessions">
                        <InputNumber v-model:value="formData.settings.max_concurrent_sessions" :min="1" :max="100" style="width: 100%" />
                      </FormItem>
                    </Col>
                    <Col :span="8">
                      <FormItem label="Session Timeout (min)">
                        <InputNumber v-model:value="formData.settings.session_timeout_minutes" :min="5" style="width: 100%" />
                      </FormItem>
                    </Col>
                    <Col :span="8">
                      <FormItem label="IP Binding">
                        <Switch v-model:checked="formData.settings.require_session_ip_binding" />
                      </FormItem>
                    </Col>
                  </Row>
                </div>
              </TabPane>

              <!-- Login Tab -->
              <TabPane key="login" tab="Login Security">
                <div class="tab-content">
                  <Row :gutter="16">
                    <Col :span="8">
                      <FormItem label="Max Failed Attempts">
                        <InputNumber v-model:value="formData.settings.max_failed_login_attempts" :min="1" :max="20" style="width: 100%" />
                      </FormItem>
                    </Col>
                    <Col :span="8">
                      <FormItem label="Lockout Duration (min)">
                        <InputNumber v-model:value="formData.settings.lockout_duration_minutes" :min="1" style="width: 100%" />
                      </FormItem>
                    </Col>
                    <Col :span="8">
                      <FormItem label="Captcha After">
                        <InputNumber v-model:value="formData.settings.require_captcha_after_failures" :min="0" style="width: 100%" />
                      </FormItem>
                    </Col>
                  </Row>
                </div>
              </TabPane>

              <!-- Password Tab -->
              <TabPane key="password" tab="Password Policy">
                <div class="tab-content">
                  <Row :gutter="16">
                    <Col :span="8">
                      <FormItem label="Min Length">
                        <InputNumber v-model:value="formData.settings.password_min_length" :min="6" :max="128" style="width: 100%" />
                      </FormItem>
                    </Col>
                    <Col :span="8">
                      <FormItem label="Expires (days, 0=never)">
                        <InputNumber v-model:value="formData.settings.password_expires_days" :min="0" style="width: 100%" />
                      </FormItem>
                    </Col>
                    <Col :span="8">
                      <FormItem label="History Count">
                        <InputNumber v-model:value="formData.settings.password_history_count" :min="0" :max="24" style="width: 100%" />
                      </FormItem>
                    </Col>
                  </Row>
                  <Row :gutter="16">
                    <Col :span="6">
                      <FormItem label="Uppercase">
                        <Switch v-model:checked="formData.settings.password_require_uppercase" />
                      </FormItem>
                    </Col>
                    <Col :span="6">
                      <FormItem label="Lowercase">
                        <Switch v-model:checked="formData.settings.password_require_lowercase" />
                      </FormItem>
                    </Col>
                    <Col :span="6">
                      <FormItem label="Numbers">
                        <Switch v-model:checked="formData.settings.password_require_numbers" />
                      </FormItem>
                    </Col>
                    <Col :span="6">
                      <FormItem label="Special Chars">
                        <Switch v-model:checked="formData.settings.password_require_special" />
                      </FormItem>
                    </Col>
                  </Row>
                </div>
              </TabPane>

              <!-- Notifications Tab -->
              <TabPane key="notifications" tab="Notifications">
                <div class="tab-content">
                  <Row :gutter="16">
                    <Col :span="8">
                      <FormItem label="Notify on Login">
                        <Switch v-model:checked="formData.settings.notify_on_login" />
                      </FormItem>
                    </Col>
                    <Col :span="8">
                      <FormItem label="Failed Login">
                        <Switch v-model:checked="formData.settings.notify_on_failed_login" />
                      </FormItem>
                    </Col>
                    <Col :span="8">
                      <FormItem label="Password Change">
                        <Switch v-model:checked="formData.settings.notify_on_password_change" />
                      </FormItem>
                    </Col>
                  </Row>
                  <Row :gutter="16">
                    <Col :span="8">
                      <FormItem label="2FA Change">
                        <Switch v-model:checked="formData.settings.notify_on_2fa_change" />
                      </FormItem>
                    </Col>
                    <Col :span="8">
                      <FormItem label="New Device">
                        <Switch v-model:checked="formData.settings.notify_on_new_device" />
                      </FormItem>
                    </Col>
                  </Row>
                </div>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>
    </div>

    <!-- ==================== LIST VIEW ==================== -->
    <div v-else>
      <!-- Header Card -->
      <Card class="mb-4 header-card">
        <Row :gutter="16" align="middle">
          <Col :span="12">
            <h2 class="text-xl font-semibold mb-0">Security Policy Templates</h2>
            <p class="text-gray-500 mt-1 mb-0">Create and manage reusable security configurations</p>
          </Col>
          <Col :span="12" class="text-right">
            <Space>
              <Button @click="seedDefaults" :loading="seeding">
                <template #icon><DatabaseOutlined /></template>
                Seed Defaults
              </Button>
              <Button type="primary" @click="openCreateForm">
                <template #icon><PlusOutlined /></template>
                New Template
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <!-- Filters Card -->
      <Card class="mb-4 filters-card">
        <Row :gutter="16" align="middle">
          <Col :xs="24" :sm="8" :md="8">
            <Input
              v-model:value="filters.search"
              placeholder="Search templates..."
              allow-clear
              @change="fetchTemplates"
            >
              <template #prefix><SearchOutlined /></template>
            </Input>
          </Col>
          <Col :xs="12" :sm="6" :md="5">
            <Select
              v-model:value="filters.is_active"
              placeholder="Status"
              allow-clear
              style="width: 100%"
              @change="fetchTemplates"
            >
              <SelectOption :value="true">Active</SelectOption>
              <SelectOption :value="false">Inactive</SelectOption>
            </Select>
          </Col>
          <Col :xs="12" :sm="4" :md="3">
            <Button @click="resetFilters">Reset Filters</Button>
          </Col>
          <Col :xs="24" :sm="6" :md="8" class="text-right">
            <RadioGroup v-model:value="viewMode" button-style="solid" size="small">
              <RadioButton value="grid">
                <AppstoreOutlined />
              </RadioButton>
              <RadioButton value="list">
                <UnorderedListOutlined />
              </RadioButton>
            </RadioGroup>
          </Col>
        </Row>
      </Card>

      <!-- ========== GRID VIEW ========== -->
      <Spin :spinning="loading" v-if="viewMode === 'grid'">
        <Row :gutter="[16, 16]">
          <Col v-for="template in templates" :key="template.id" :xs="24" :sm="12" :lg="8">
            <Card
              hoverable
              class="template-card"
              :class="{ 'inactive': !template.is_active }"
            >
              <template #title>
                <div class="card-title-row">
                  <a class="card-title-link" @click="openViewForm(template)">{{ template.name }}</a>
                  <Tag :color="template.is_active ? 'green' : 'default'" size="small">
                    {{ template.is_active ? 'Active' : 'Inactive' }}
                  </Tag>
                </div>
              </template>
              <template #extra>
                <Dropdown>
                  <Button type="text" size="small">
                    <MoreOutlined />
                  </Button>
                  <template #overlay>
                    <Menu>
                      <MenuItem @click="openViewForm(template)">
                        <EyeOutlined /> View
                      </MenuItem>
                      <MenuItem @click="openEditForm(template)">
                        <EditOutlined /> Edit
                      </MenuItem>
                      <MenuItem @click="duplicateTemplate(template)">
                        <CopyOutlined /> Duplicate
                      </MenuItem>
                      <MenuItem @click="toggleActive(template)">
                        <template v-if="template.is_active">
                          <StopOutlined /> Deactivate
                        </template>
                        <template v-else>
                          <CheckCircleOutlined /> Activate
                        </template>
                      </MenuItem>
                      <MenuDivider />
                      <MenuItem @click="openApplyModal(template)" :disabled="!template.is_active">
                        <UsergroupAddOutlined /> Apply to Users
                      </MenuItem>
                      <MenuDivider />
                      <MenuItem @click="confirmDelete(template)" danger>
                        <DeleteOutlined /> Delete
                      </MenuItem>
                    </Menu>
                  </template>
                </Dropdown>
              </template>

              <p class="text-gray-500 mb-3">{{ template.description || 'No description' }}</p>

              <div class="template-code mb-3">
                <Tag color="blue">{{ template.code }}</Tag>
                <Tag v-if="template.priority !== null && template.priority !== undefined" color="purple">Priority: {{ template.priority }}</Tag>
              </div>

              <Divider class="my-3" />

              <!-- Settings Summary -->
              <div class="settings-summary">
                <div class="setting-row">
                  <span class="setting-label">2FA Required:</span>
                  <Tag :color="template.settings?.two_factor_required ? 'green' : 'default'" size="small">
                    {{ template.settings?.two_factor_required ? 'Yes' : 'No' }}
                  </Tag>
                </div>
                <div class="setting-row">
                  <span class="setting-label">Max Sessions:</span>
                  <span class="setting-value">{{ template.settings?.max_concurrent_sessions || 5 }}</span>
                </div>
                <div class="setting-row">
                  <span class="setting-label">Password Expires:</span>
                  <span class="setting-value">
                    {{ template.settings?.password_expires_days ? template.settings.password_expires_days + ' days' : 'Never' }}
                  </span>
                </div>
              </div>

              <Divider class="my-3" />

              <!-- Usage Stats -->
              <div class="template-stats">
                <Statistic title="Applied To" :value="template.applied_count || 0" suffix="users" />
                <div v-if="template.last_applied_at" class="text-xs text-gray-400 mt-1">
                  Last applied: {{ formatDate(template.last_applied_at) }}
                </div>
              </div>

              <!-- Auto-Apply Info -->
              <div v-if="template.apply_to_new_users || (template.apply_to_roles && template.apply_to_roles.length)" class="mt-3">
                <Divider class="my-3" />
                <div class="auto-apply-info">
                  <Tag v-if="template.apply_to_new_users" color="cyan" size="small">
                    <UserAddOutlined /> Auto-apply to new users
                  </Tag>
                  <Tag v-if="template.apply_to_roles?.length" color="cyan" size="small">
                    <TeamOutlined /> {{ template.apply_to_roles.length }} role(s)
                  </Tag>
                </div>
              </div>

              <Divider class="my-3" />

              <!-- Card Action Buttons -->
              <div class="card-actions">
                <Button type="primary" size="small" @click="openViewForm(template)">
                  <template #icon><EyeOutlined /></template>
                  View
                </Button>
                <Button size="small" @click="openEditForm(template)">
                  <template #icon><EditOutlined /></template>
                  Edit
                </Button>
              </div>
            </Card>
          </Col>

          <Col v-if="!loading && templates.length === 0" :span="24">
            <AEmpty description="No security policy templates found">
              <Button type="primary" @click="openCreateForm">Create First Template</Button>
            </AEmpty>
          </Col>
        </Row>
      </Spin>

      <!-- ========== LIST VIEW ========== -->
      <Card v-if="viewMode === 'list'" class="list-view-card">
        <Table
          :columns="tableColumns"
          :data-source="templates"
          :loading="loading"
          :pagination="false"
          row-key="id"
          :scroll="{ x: 1100 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <div>
                <a class="template-name-link" @click="openViewForm(record)">{{ record.name }}</a>
                <Tag
                  :color="record.is_active ? 'green' : 'default'"
                  size="small"
                  style="margin-left: 8px"
                >
                  {{ record.is_active ? 'Active' : 'Inactive' }}
                </Tag>
              </div>
            </template>
            <template v-if="column.key === 'code'">
              <Tag color="blue">{{ record.code }}</Tag>
            </template>
            <template v-if="column.key === 'priority'">
              <Tag color="purple">{{ record.priority }}</Tag>
            </template>
            <template v-if="column.key === 'two_factor'">
              <Tag :color="record.settings?.two_factor_required ? 'green' : 'default'" size="small">
                {{ record.settings?.two_factor_required ? 'Yes' : 'No' }}
              </Tag>
            </template>
            <template v-if="column.key === 'max_sessions'">
              {{ record.settings?.max_concurrent_sessions || 5 }}
            </template>
            <template v-if="column.key === 'password_expires'">
              {{ record.settings?.password_expires_days ? record.settings.password_expires_days + ' days' : 'Never' }}
            </template>
            <template v-if="column.key === 'applied_count'">
              <Tag color="geekblue">{{ record.applied_count || 0 }}</Tag>
            </template>
            <template v-if="column.key === 'status'">
              <Tag :color="record.is_active ? 'green' : 'red'">
                {{ record.is_active ? 'Active' : 'Inactive' }}
              </Tag>
            </template>
            <template v-if="column.key === 'actions'">
              <Space>
                <Tooltip title="View">
                  <Button type="link" size="small" @click="openViewForm(record)">
                    <EyeOutlined />
                  </Button>
                </Tooltip>
                <Tooltip title="Edit">
                  <Button type="link" size="small" @click="openEditForm(record)">
                    <EditOutlined />
                  </Button>
                </Tooltip>
                <Tooltip :title="record.is_active ? 'Deactivate' : 'Activate'">
                  <Button type="link" size="small" @click="toggleActive(record)">
                    <StopOutlined v-if="record.is_active" />
                    <CheckCircleOutlined v-else />
                  </Button>
                </Tooltip>
                <Tooltip title="Apply to Users" v-if="record.is_active">
                  <Button type="link" size="small" @click="openApplyModal(record)">
                    <UsergroupAddOutlined />
                  </Button>
                </Tooltip>
                <Tooltip title="Delete">
                  <Button type="link" size="small" danger @click="confirmDelete(record)">
                    <DeleteOutlined />
                  </Button>
                </Tooltip>
              </Space>
            </template>
          </template>
        </Table>
      </Card>
    </div>

    <!-- ==================== APPLY TO USERS MODAL ==================== -->
    <Modal
      v-model:open="applyModalVisible"
      title="Apply Template to Users"
      width="600px"
      :confirm-loading="applying"
      @ok="applyTemplateToUsers"
      @cancel="closeApplyModal"
    >
      <Alert
        type="info"
        class="mb-4"
        :message="'Applying: ' + (applyingTemplate?.name || '')"
        :description="applyingTemplate?.description"
        show-icon
      />

      <FormItem label="Select Users">
        <Select
          v-model:value="applyUserIds"
          mode="multiple"
          placeholder="Search and select users"
          style="width: 100%"
          show-search
          :filter-option="filterUserOption"
          :loading="loadingUsers"
          @search="searchUsers"
        >
          <SelectOption v-for="user in userOptions" :key="user.id" :value="user.id">
            {{ user.email }} ({{ user.full_name || 'No name' }})
          </SelectOption>
        </Select>
      </FormItem>

      <FormItem>
        <Checkbox v-model:checked="overrideLocked">
          Override locked settings (admin override)
        </Checkbox>
      </FormItem>

      <Alert
        v-if="applyUserIds.length > 0"
        type="warning"
        :message="'This will apply security settings to ' + applyUserIds.length + ' user(s)'"
        show-icon
      />
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import {
  message,
  Modal,
  Checkbox,
  Card,
  Row,
  Col,
  Button,
  Input,
  Select,
  SelectOption,
  Spin,
  Tag,
  Form,
  FormItem,
  Tabs,
  TabPane,
  Switch,
  InputNumber,
  Textarea,
  Divider,
  Dropdown,
  Menu,
  MenuItem,
  MenuDivider,
  Empty,
  Space,
  Alert,
  Statistic,
  Table,
  Tooltip,
  RadioGroup,
  RadioButton,
} from 'ant-design-vue';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  MoreOutlined,
  StopOutlined,
  CheckCircleOutlined,
  UsergroupAddOutlined,
  DatabaseOutlined,
  UserAddOutlined,
  TeamOutlined,
  EyeOutlined,
  ArrowLeftOutlined,
  SaveOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons-vue';
import dayjs from 'dayjs';
import {
  getSecurityPolicyTemplatesApi,
  getSecurityPolicyTemplateApi,
  createSecurityPolicyTemplateApi,
  updateSecurityPolicyTemplateApi,
  deleteSecurityPolicyTemplateApi,
  applySecurityPolicyTemplateApi,
  toggleSecurityPolicyTemplateApi,
  seedDefaultSecurityPolicyTemplatesApi,
} from '#/api/base_security';
import { requestClient } from '#/api/request';

// ==================== VIEW STATE ====================
const currentView = ref('list');
const selectedTemplateId = ref(null);
const viewMode = ref('grid');

// ==================== LIST STATE ====================
const loading = ref(false);
const saving = ref(false);
const seeding = ref(false);
const applying = ref(false);
const templates = ref([]);
const applyModalVisible = ref(false);
const applyingTemplate = ref(null);
const activeSettingsTab = ref('2fa');

// Filters
const filters = reactive({
  search: '',
  is_active: null,
});

// ==================== FORM STATE ====================
const getDefaultFormData = () => ({
  name: '',
  code: '',
  description: '',
  priority: 50,
  is_active: true,
  apply_to_new_users: false,
  apply_to_roles: [],
  apply_to_departments: [],
  settings: {
    two_factor_required: false,
    two_factor_methods: ['totp'],
    api_access_enabled: true,
    api_rate_limit_per_hour: 1000,
    api_rate_limit_per_minute: 60,
    max_concurrent_sessions: 5,
    session_timeout_minutes: 1440,
    require_session_ip_binding: false,
    max_failed_login_attempts: 5,
    lockout_duration_minutes: 30,
    require_captcha_after_failures: 3,
    password_min_length: 8,
    password_expires_days: 0,
    password_history_count: 5,
    password_require_uppercase: true,
    password_require_lowercase: true,
    password_require_numbers: true,
    password_require_special: false,
    notify_on_login: false,
    notify_on_failed_login: true,
    notify_on_password_change: true,
    notify_on_2fa_change: true,
    notify_on_new_device: true,
  },
});

const formData = reactive(getDefaultFormData());

// Apply Modal
const applyUserIds = ref([]);
const overrideLocked = ref(false);
const userOptions = ref([]);
const loadingUsers = ref(false);

// ==================== TABLE COLUMNS ====================
const tableColumns = [
  { title: 'Name', key: 'name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
  { title: 'Code', key: 'code', dataIndex: 'code', width: 140 },
  { title: 'Priority', key: 'priority', dataIndex: 'priority', width: 100, sorter: (a, b) => (a.priority || 0) - (b.priority || 0) },
  { title: '2FA Required', key: 'two_factor', width: 120 },
  { title: 'Max Sessions', key: 'max_sessions', width: 120 },
  { title: 'Password Expires', key: 'password_expires', width: 140 },
  { title: 'Applied Count', key: 'applied_count', width: 130, sorter: (a, b) => (a.applied_count || 0) - (b.applied_count || 0) },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Actions', key: 'actions', width: 200, fixed: 'right' },
];

// ==================== VIEW NAVIGATION ====================
const openCreateForm = () => {
  selectedTemplateId.value = null;
  Object.assign(formData, getDefaultFormData());
  activeSettingsTab.value = '2fa';
  currentView.value = 'form';
};

const openEditForm = async (template) => {
  selectedTemplateId.value = template.id;
  try {
    const full = await getSecurityPolicyTemplateApi(template.id);
    Object.assign(formData, {
      name: full.name,
      code: full.code,
      description: full.description,
      priority: full.priority,
      is_active: full.is_active,
      apply_to_new_users: full.apply_to_new_users,
      apply_to_roles: full.apply_to_roles || [],
      apply_to_departments: full.apply_to_departments || [],
      settings: { ...getDefaultFormData().settings, ...full.settings },
    });
    activeSettingsTab.value = '2fa';
    currentView.value = 'form';
  } catch (error) {
    message.error('Failed to load template details');
  }
};

const openViewForm = async (template) => {
  await openEditForm(template);
};

const backToList = () => {
  currentView.value = 'list';
  selectedTemplateId.value = null;
};

const onFormSaved = () => {
  fetchTemplates();
};

// ==================== CRUD OPERATIONS ====================
const fetchTemplates = async () => {
  loading.value = true;
  try {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.is_active !== null && filters.is_active !== undefined) params.is_active = filters.is_active;
    templates.value = await getSecurityPolicyTemplatesApi(params);
  } catch (error) {
    message.error('Failed to load templates');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  filters.search = '';
  filters.is_active = null;
  fetchTemplates();
};

const saveTemplate = async () => {
  if (!formData.name || !formData.code) {
    message.error('Name and code are required');
    return;
  }

  saving.value = true;
  try {
    if (selectedTemplateId.value) {
      await updateSecurityPolicyTemplateApi(selectedTemplateId.value, formData);
      message.success('Template updated');
    } else {
      await createSecurityPolicyTemplateApi(formData);
      message.success('Template created');
    }
    onFormSaved();
    backToList();
  } catch (error) {
    message.error(error.response?.data?.detail || 'Failed to save template');
  } finally {
    saving.value = false;
  }
};

const duplicateTemplate = (template) => {
  selectedTemplateId.value = null;
  Object.assign(formData, {
    name: template.name + ' (Copy)',
    code: template.code + '_copy',
    description: template.description,
    priority: template.priority,
    is_active: false,
    apply_to_new_users: false,
    apply_to_roles: [],
    apply_to_departments: [],
    settings: { ...getDefaultFormData().settings, ...template.settings },
  });
  activeSettingsTab.value = '2fa';
  currentView.value = 'form';
};

const toggleActive = async (template) => {
  try {
    await toggleSecurityPolicyTemplateApi(template.id);
    message.success('Template ' + (template.is_active ? 'deactivated' : 'activated'));
    fetchTemplates();
  } catch (error) {
    message.error('Failed to toggle template status');
  }
};

const confirmDelete = (template) => {
  Modal.confirm({
    title: 'Delete Template',
    content: 'Are you sure you want to delete "' + template.name + '"? This cannot be undone.',
    okText: 'Delete',
    okType: 'danger',
    onOk: async () => {
      try {
        await deleteSecurityPolicyTemplateApi(template.id);
        message.success('Template deleted');
        fetchTemplates();
      } catch (error) {
        message.error('Failed to delete template');
      }
    },
  });
};

const seedDefaults = async () => {
  seeding.value = true;
  try {
    const created = await seedDefaultSecurityPolicyTemplatesApi();
    if (created.length > 0) {
      message.success('Created ' + created.length + ' default template(s)');
    } else {
      message.info('All default templates already exist');
    }
    fetchTemplates();
  } catch (error) {
    message.error('Failed to seed default templates');
  } finally {
    seeding.value = false;
  }
};

// ==================== APPLY MODAL ====================
const openApplyModal = (template) => {
  applyingTemplate.value = template;
  applyUserIds.value = [];
  overrideLocked.value = false;
  applyModalVisible.value = true;
  searchUsers('');
};

const closeApplyModal = () => {
  applyModalVisible.value = false;
  applyingTemplate.value = null;
};

const searchUsers = async (query) => {
  loadingUsers.value = true;
  try {
    const response = await requestClient.get('/users/', {
      params: { search: query, limit: 50, is_active: true },
    });
    userOptions.value = response.items || response || [];
  } catch (error) {
    console.error('Failed to search users:', error);
    userOptions.value = [];
  } finally {
    loadingUsers.value = false;
  }
};

const filterUserOption = (input, option) => {
  const user = userOptions.value.find(u => u.id === option.value);
  if (!user) return false;
  const searchStr = (user.email + ' ' + (user.full_name || '')).toLowerCase();
  return searchStr.includes(input.toLowerCase());
};

const applyTemplateToUsers = async () => {
  if (applyUserIds.value.length === 0) {
    message.error('Please select at least one user');
    return;
  }

  applying.value = true;
  try {
    const result = await applySecurityPolicyTemplateApi(
      applyingTemplate.value.id,
      applyUserIds.value,
      overrideLocked.value
    );
    message.success('Applied to ' + result.success_count + ' user(s)');
    if (result.failure_count > 0) {
      message.warning('Failed for ' + result.failure_count + ' user(s)');
    }
    closeApplyModal();
    fetchTemplates();
  } catch (error) {
    message.error('Failed to apply template');
  } finally {
    applying.value = false;
  }
};

// ==================== UTILITIES ====================
const formatDate = (date) => {
  if (!date) return 'Never';
  return dayjs(date).format('MMM D, YYYY HH:mm');
};

// ==================== LIFECYCLE ====================
onMounted(() => {
  fetchTemplates();
});
</script>

<style scoped>
.security-policy-templates {
  padding: 16px;
}

/* ========== HEADER / FILTER CARDS ========== */
.header-card,
.filters-card {
  border-radius: 8px;
}

.mb-4 {
  margin-bottom: 16px;
}

.text-right {
  text-align: right;
}

.text-xl {
  font-size: 20px;
}

.font-semibold {
  font-weight: 600;
}

.mb-0 {
  margin-bottom: 0;
}

.mt-1 {
  margin-top: 4px;
}

.mt-3 {
  margin-top: 12px;
}

.mb-3 {
  margin-bottom: 12px;
}

.my-3 {
  margin-top: 12px;
  margin-bottom: 12px;
}

.text-gray-500 {
  color: #6b7280;
}

.text-gray-400 {
  color: #9ca3af;
}

.text-xs {
  font-size: 12px;
}

/* ========== GRID VIEW: TEMPLATE CARDS ========== */
.template-card {
  height: 100%;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.template-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.template-card.inactive {
  opacity: 0.7;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-title-link {
  color: #1890ff;
  cursor: pointer;
  font-weight: 600;
  transition: color 0.2s;
}

.card-title-link:hover {
  color: #40a9ff;
}

.template-code {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.settings-summary {
  font-size: 13px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.setting-label {
  color: #666;
}

.setting-value {
  font-weight: 500;
}

.template-stats {
  text-align: center;
}

.auto-apply-info {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.card-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

/* ========== LIST VIEW ========== */
.list-view-card {
  border-radius: 8px;
}

.template-name-link {
  color: #1890ff;
  cursor: pointer;
  font-weight: 500;
  transition: color 0.2s;
}

.template-name-link:hover {
  color: #40a9ff;
}

/* ========== FORM VIEW ========== */
.form-view {
  min-height: 100%;
}

.form-header {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-radius: 10px;
  padding: 24px 28px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.form-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.form-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  color: #fff !important;
  font-size: 18px;
}

.back-btn:hover {
  color: #69c0ff !important;
}

.form-title {
  color: #fff;
  font-size: 22px;
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
}

.form-subtitle {
  color: rgba(255, 255, 255, 0.65);
  font-size: 14px;
  margin: 2px 0 0 0;
}

.form-header-right {
  display: flex;
  align-items: center;
}

.form-body {
  margin-top: 0;
}

.form-sidebar-card,
.form-main-card {
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
}

.sidebar-section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1f1f1f;
}

.switch-row {
  display: flex;
  align-items: center;
}

.tab-content {
  padding: 12px 0;
}
</style>
