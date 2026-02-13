<script setup>
/**
 * Field-Level Security View
 *
 * Manage field-level access control:
 * - Profiles: Named collections of field security rules
 * - Rules: Per-field access levels (hidden, read, edit) with optional masking
 * - Role Assignments: Link profiles to roles
 * - User Overrides: User-specific exceptions
 */

import { Page } from '@vben/common-ui';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Textarea,
  Tooltip,
  TabPane,
} from 'ant-design-vue';
import {
  LockOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  FormOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import { ref, reactive, onMounted, computed } from 'vue';
import { useNotification } from '#/composables';
import {
  getFieldSecurityProfilesApi,
  getFieldSecurityProfileApi,
  createFieldSecurityProfileApi,
  updateFieldSecurityProfileApi,
  deleteFieldSecurityProfileApi,
  getFieldSecurityRulesApi,
  getFieldSecurityRuleApi,
  createFieldSecurityRuleApi,
  updateFieldSecurityRuleApi,
  deleteFieldSecurityRuleApi,
  getFieldSecurityRoleAssignmentsApi,
  assignFieldSecurityToRoleApi,
  deleteFieldSecurityRoleAssignmentApi,
  getFieldSecurityOverridesApi,
  createFieldSecurityOverrideApi,
  updateFieldSecurityOverrideApi,
  deleteFieldSecurityOverrideApi,
  ACCESS_LEVELS,
  MASK_TYPES,
  getAccessLevelConfig,
  getMaskTypeConfig,
} from '#/api/base_security';

defineOptions({ name: 'BaseFieldSecurity' });

const { showSuccess, showError } = useNotification();

// Active tab
const activeTab = ref('profiles');

// ============================================================================
// PROFILES TAB
// ============================================================================

const profilesLoading = ref(false);
const profiles = ref([]);
const profilesPagination = ref({ current: 1, pageSize: 20, total: 0 });
const profileModalVisible = ref(false);
const isEditingProfile = ref(false);
const editingProfileId = ref(null);
const profileForm = reactive({
  name: '',
  code: '',
  description: '',
  is_active: true,
});

const profileColumns = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 200 },
  { title: 'Code', dataIndex: 'code', key: 'code', width: 150 },
  { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Rules', dataIndex: 'rule_count', key: 'rule_count', width: 80, align: 'center' },
  { title: 'Status', dataIndex: 'is_active', key: 'is_active', width: 100, align: 'center' },
  { title: 'Actions', key: 'actions', width: 120, align: 'center', fixed: 'right' },
];

async function fetchProfiles() {
  profilesLoading.value = true;
  try {
    const res = await getFieldSecurityProfilesApi({
      page: profilesPagination.value.current,
      page_size: profilesPagination.value.pageSize,
    });
    profiles.value = res.items || [];
    profilesPagination.value.total = res.total || 0;
  } catch (err) {
    showError('Failed to load field security profiles');
  } finally {
    profilesLoading.value = false;
  }
}

function openCreateProfileModal() {
  isEditingProfile.value = false;
  editingProfileId.value = null;
  Object.assign(profileForm, { name: '', code: '', description: '', is_active: true });
  profileModalVisible.value = true;
}

async function openEditProfileModal(record) {
  isEditingProfile.value = true;
  editingProfileId.value = record.id;
  try {
    const detail = await getFieldSecurityProfileApi(record.id);
    Object.assign(profileForm, {
      name: detail.name || '',
      code: detail.code || '',
      description: detail.description || '',
      is_active: detail.is_active !== false,
    });
    profileModalVisible.value = true;
  } catch (err) {
    showError('Failed to load profile details');
  }
}

async function saveProfile() {
  if (!profileForm.name) {
    showError('Name is required');
    return;
  }
  try {
    const payload = { ...profileForm };
    if (!payload.code) {
      payload.code = payload.name.toLowerCase().replace(/\s+/g, '_');
    }
    if (isEditingProfile.value) {
      await updateFieldSecurityProfileApi(editingProfileId.value, payload);
      showSuccess('Profile updated');
    } else {
      await createFieldSecurityProfileApi(payload);
      showSuccess('Profile created');
    }
    profileModalVisible.value = false;
    await fetchProfiles();
  } catch (err) {
    showError(err.response?.data?.detail || 'Failed to save profile');
  }
}

async function deleteProfile(record) {
  try {
    await deleteFieldSecurityProfileApi(record.id);
    showSuccess('Profile deleted');
    await fetchProfiles();
  } catch (err) {
    showError(err.response?.data?.detail || 'Failed to delete profile');
  }
}

// ============================================================================
// RULES TAB
// ============================================================================

const rulesLoading = ref(false);
const rules = ref([]);
const rulesPagination = ref({ current: 1, pageSize: 20, total: 0 });
const rulesFilter = reactive({ profile_id: null, model_name: null });
const ruleModalVisible = ref(false);
const isEditingRule = ref(false);
const editingRuleId = ref(null);
const ruleForm = reactive({
  profile_id: null,
  model_name: '',
  field_name: '',
  access_level: 'read',
  mask_type: 'none',
  mask_characters: 4,
  mask_pattern: '',
});

// Available models (would come from API)
const availableModels = ref([
  { value: 'Employee', label: 'Employee' },
  { value: 'User', label: 'User' },
  { value: 'Payroll', label: 'Payroll' },
  { value: 'Leave', label: 'Leave' },
  { value: 'Attendance', label: 'Attendance' },
]);

const ruleColumns = [
  { title: 'Profile', dataIndex: 'profile_name', key: 'profile_name', width: 150 },
  { title: 'Model', dataIndex: 'model_name', key: 'model_name', width: 120 },
  { title: 'Field', dataIndex: 'field_name', key: 'field_name', width: 150 },
  { title: 'Access Level', dataIndex: 'access_level', key: 'access_level', width: 120, align: 'center' },
  { title: 'Masking', dataIndex: 'mask_type', key: 'mask_type', width: 120, align: 'center' },
  { title: 'Actions', key: 'actions', width: 120, align: 'center', fixed: 'right' },
];

const accessLevelOptions = ACCESS_LEVELS.map(l => ({ value: l.value, label: l.label }));
const maskTypeOptions = MASK_TYPES.map(t => ({ value: t.value, label: t.label }));

async function fetchRules() {
  rulesLoading.value = true;
  try {
    const params = {
      page: rulesPagination.value.current,
      page_size: rulesPagination.value.pageSize,
    };
    if (rulesFilter.profile_id) params.profile_id = rulesFilter.profile_id;
    if (rulesFilter.model_name) params.model_name = rulesFilter.model_name;

    const res = await getFieldSecurityRulesApi(params);
    rules.value = res.items || [];
    rulesPagination.value.total = res.total || 0;
  } catch (err) {
    showError('Failed to load field security rules');
  } finally {
    rulesLoading.value = false;
  }
}

function openCreateRuleModal() {
  isEditingRule.value = false;
  editingRuleId.value = null;
  Object.assign(ruleForm, {
    profile_id: rulesFilter.profile_id || null,
    model_name: rulesFilter.model_name || '',
    field_name: '',
    access_level: 'read',
    mask_type: 'none',
    mask_characters: 4,
    mask_pattern: '',
  });
  ruleModalVisible.value = true;
}

async function openEditRuleModal(record) {
  isEditingRule.value = true;
  editingRuleId.value = record.id;
  try {
    const detail = await getFieldSecurityRuleApi(record.id);
    Object.assign(ruleForm, {
      profile_id: detail.profile_id,
      model_name: detail.model_name || '',
      field_name: detail.field_name || '',
      access_level: detail.access_level || 'read',
      mask_type: detail.mask_type || 'none',
      mask_characters: detail.mask_characters || 4,
      mask_pattern: detail.mask_pattern || '',
    });
    ruleModalVisible.value = true;
  } catch (err) {
    showError('Failed to load rule details');
  }
}

async function saveRule() {
  if (!ruleForm.profile_id || !ruleForm.model_name || !ruleForm.field_name) {
    showError('Profile, Model, and Field are required');
    return;
  }
  try {
    if (isEditingRule.value) {
      await updateFieldSecurityRuleApi(editingRuleId.value, ruleForm);
      showSuccess('Rule updated');
    } else {
      await createFieldSecurityRuleApi(ruleForm);
      showSuccess('Rule created');
    }
    ruleModalVisible.value = false;
    await fetchRules();
  } catch (err) {
    showError(err.response?.data?.detail || 'Failed to save rule');
  }
}

async function deleteRule(record) {
  try {
    await deleteFieldSecurityRuleApi(record.id);
    showSuccess('Rule deleted');
    await fetchRules();
  } catch (err) {
    showError(err.response?.data?.detail || 'Failed to delete rule');
  }
}

// ============================================================================
// ROLE ASSIGNMENTS TAB
// ============================================================================

const assignmentsLoading = ref(false);
const assignments = ref([]);
const assignmentModalVisible = ref(false);
const assignmentForm = reactive({
  profile_id: null,
  role_id: null,
  priority: 10,
});

// Available roles (would come from API)
const availableRoles = ref([
  { value: 1, label: 'CEO' },
  { value: 2, label: 'Manager' },
  { value: 3, label: 'Team Lead' },
  { value: 4, label: 'Employee' },
  { value: 5, label: 'HR Admin' },
]);

const assignmentColumns = [
  { title: 'Profile', dataIndex: 'profile_name', key: 'profile_name', width: 200 },
  { title: 'Role', dataIndex: 'role_name', key: 'role_name', width: 200 },
  { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 100, align: 'center' },
  { title: 'Actions', key: 'actions', width: 100, align: 'center' },
];

async function fetchAssignments() {
  assignmentsLoading.value = true;
  try {
    const res = await getFieldSecurityRoleAssignmentsApi();
    assignments.value = res.items || res || [];
  } catch (err) {
    showError('Failed to load role assignments');
  } finally {
    assignmentsLoading.value = false;
  }
}

function openAssignmentModal() {
  Object.assign(assignmentForm, { profile_id: null, role_id: null, priority: 10 });
  assignmentModalVisible.value = true;
}

async function saveAssignment() {
  if (!assignmentForm.profile_id || !assignmentForm.role_id) {
    showError('Profile and Role are required');
    return;
  }
  try {
    await assignFieldSecurityToRoleApi(assignmentForm);
    showSuccess('Assignment created');
    assignmentModalVisible.value = false;
    await fetchAssignments();
  } catch (err) {
    showError(err.response?.data?.detail || 'Failed to create assignment');
  }
}

async function deleteAssignment(record) {
  try {
    await deleteFieldSecurityRoleAssignmentApi(record.profile_id, record.role_id);
    showSuccess('Assignment deleted');
    await fetchAssignments();
  } catch (err) {
    showError(err.response?.data?.detail || 'Failed to delete assignment');
  }
}

// ============================================================================
// USER OVERRIDES TAB
// ============================================================================

const overridesLoading = ref(false);
const overrides = ref([]);
const overridesPagination = ref({ current: 1, pageSize: 20, total: 0 });
const overrideModalVisible = ref(false);
const isEditingOverride = ref(false);
const editingOverrideId = ref(null);
const overrideForm = reactive({
  user_id: null,
  model_name: '',
  field_name: '',
  access_level: 'read',
  valid_from: null,
  valid_until: null,
  reason: '',
});

const overrideColumns = [
  { title: 'User', dataIndex: 'user_name', key: 'user_name', width: 150 },
  { title: 'Model', dataIndex: 'model_name', key: 'model_name', width: 120 },
  { title: 'Field', dataIndex: 'field_name', key: 'field_name', width: 150 },
  { title: 'Access Level', dataIndex: 'access_level', key: 'access_level', width: 120, align: 'center' },
  { title: 'Valid From', dataIndex: 'valid_from', key: 'valid_from', width: 120 },
  { title: 'Valid Until', dataIndex: 'valid_until', key: 'valid_until', width: 120 },
  { title: 'Actions', key: 'actions', width: 120, align: 'center', fixed: 'right' },
];

async function fetchOverrides() {
  overridesLoading.value = true;
  try {
    const res = await getFieldSecurityOverridesApi({
      page: overridesPagination.value.current,
      page_size: overridesPagination.value.pageSize,
    });
    overrides.value = res.items || [];
    overridesPagination.value.total = res.total || 0;
  } catch (err) {
    showError('Failed to load user overrides');
  } finally {
    overridesLoading.value = false;
  }
}

function openCreateOverrideModal() {
  isEditingOverride.value = false;
  editingOverrideId.value = null;
  Object.assign(overrideForm, {
    user_id: null,
    model_name: '',
    field_name: '',
    access_level: 'read',
    valid_from: null,
    valid_until: null,
    reason: '',
  });
  overrideModalVisible.value = true;
}

async function openEditOverrideModal(record) {
  isEditingOverride.value = true;
  editingOverrideId.value = record.id;
  Object.assign(overrideForm, {
    user_id: record.user_id,
    model_name: record.model_name || '',
    field_name: record.field_name || '',
    access_level: record.access_level || 'read',
    valid_from: record.valid_from,
    valid_until: record.valid_until,
    reason: record.reason || '',
  });
  overrideModalVisible.value = true;
}

async function saveOverride() {
  if (!overrideForm.user_id || !overrideForm.model_name || !overrideForm.field_name) {
    showError('User, Model, and Field are required');
    return;
  }
  try {
    if (isEditingOverride.value) {
      await updateFieldSecurityOverrideApi(editingOverrideId.value, overrideForm);
      showSuccess('Override updated');
    } else {
      await createFieldSecurityOverrideApi(overrideForm);
      showSuccess('Override created');
    }
    overrideModalVisible.value = false;
    await fetchOverrides();
  } catch (err) {
    showError(err.response?.data?.detail || 'Failed to save override');
  }
}

async function deleteOverride(record) {
  try {
    await deleteFieldSecurityOverrideApi(record.id);
    showSuccess('Override deleted');
    await fetchOverrides();
  } catch (err) {
    showError(err.response?.data?.detail || 'Failed to delete override');
  }
}

// ============================================================================
// TAB CHANGE HANDLER
// ============================================================================

function handleTabChange(key) {
  activeTab.value = key;
  if (key === 'profiles') fetchProfiles();
  else if (key === 'rules') fetchRules();
  else if (key === 'assignments') fetchAssignments();
  else if (key === 'overrides') fetchOverrides();
}

// Profile options for select dropdowns
const profileOptions = computed(() =>
  profiles.value.map(p => ({ value: p.id, label: p.name }))
);

onMounted(() => {
  fetchProfiles();
});
</script>

<template>
  <Page auto-content-height>
    <Card>
      <template #title>
        <div class="flex items-center">
          <LockOutlined class="mr-2 text-lg" />
          <span>Field-Level Security</span>
        </div>
      </template>

      <Alert
        class="mb-4"
        type="info"
        show-icon
        message="Field-Level Security restricts access to specific fields based on profiles. Configure profiles, define field rules, and assign profiles to roles."
      />

      <Tabs v-model:activeKey="activeTab" @change="handleTabChange">
        <!-- Profiles Tab -->
        <TabPane key="profiles" tab="Security Profiles">
          <div class="mb-4 flex justify-between">
            <Button @click="fetchProfiles" :loading="profilesLoading">
              <template #icon><ReloadOutlined /></template>
              Refresh
            </Button>
            <Button type="primary" @click="openCreateProfileModal">
              <template #icon><PlusOutlined /></template>
              New Profile
            </Button>
          </div>

          <Spin :spinning="profilesLoading">
            <Table
              :columns="profileColumns"
              :dataSource="profiles"
              :pagination="profilesPagination"
              @change="(pag) => { profilesPagination.current = pag.current; fetchProfiles(); }"
              rowKey="id"
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'is_active'">
                  <Tag :color="record.is_active ? 'green' : 'default'">
                    {{ record.is_active ? 'Active' : 'Inactive' }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <Space>
                    <Tooltip title="Edit">
                      <Button type="text" size="small" @click="openEditProfileModal(record)">
                        <template #icon><EditOutlined /></template>
                      </Button>
                    </Tooltip>
                    <Popconfirm title="Delete this profile?" @confirm="deleteProfile(record)" okType="danger">
                      <Tooltip title="Delete">
                        <Button type="text" size="small" danger>
                          <template #icon><DeleteOutlined /></template>
                        </Button>
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                </template>
              </template>
            </Table>
          </Spin>
        </TabPane>

        <!-- Rules Tab -->
        <TabPane key="rules" tab="Field Rules">
          <div class="mb-4 flex flex-wrap gap-4 justify-between">
            <Space>
              <Select
                v-model:value="rulesFilter.profile_id"
                placeholder="Filter by Profile"
                style="width: 180px"
                allowClear
                :options="profileOptions"
                @change="() => { rulesPagination.current = 1; fetchRules(); }"
              />
              <Select
                v-model:value="rulesFilter.model_name"
                placeholder="Filter by Model"
                style="width: 150px"
                allowClear
                :options="availableModels"
                @change="() => { rulesPagination.current = 1; fetchRules(); }"
              />
              <Button @click="fetchRules" :loading="rulesLoading">
                <template #icon><ReloadOutlined /></template>
              </Button>
            </Space>
            <Button type="primary" @click="openCreateRuleModal">
              <template #icon><PlusOutlined /></template>
              New Rule
            </Button>
          </div>

          <Spin :spinning="rulesLoading">
            <Table
              :columns="ruleColumns"
              :dataSource="rules"
              :pagination="rulesPagination"
              @change="(pag) => { rulesPagination.current = pag.current; fetchRules(); }"
              rowKey="id"
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'access_level'">
                  <Tag :color="getAccessLevelConfig(record.access_level).color">
                    <EyeInvisibleOutlined v-if="record.access_level === 'hidden'" class="mr-1" />
                    <EyeOutlined v-else-if="record.access_level === 'read'" class="mr-1" />
                    <FormOutlined v-else class="mr-1" />
                    {{ getAccessLevelConfig(record.access_level).label }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'mask_type'">
                  <Tag v-if="record.mask_type && record.mask_type !== 'none'" color="orange">
                    {{ getMaskTypeConfig(record.mask_type).label }}
                  </Tag>
                  <span v-else class="text-gray-400">None</span>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <Space>
                    <Tooltip title="Edit">
                      <Button type="text" size="small" @click="openEditRuleModal(record)">
                        <template #icon><EditOutlined /></template>
                      </Button>
                    </Tooltip>
                    <Popconfirm title="Delete this rule?" @confirm="deleteRule(record)" okType="danger">
                      <Tooltip title="Delete">
                        <Button type="text" size="small" danger>
                          <template #icon><DeleteOutlined /></template>
                        </Button>
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                </template>
              </template>
            </Table>
          </Spin>
        </TabPane>

        <!-- Role Assignments Tab -->
        <TabPane key="assignments" tab="Role Assignments">
          <div class="mb-4 flex justify-between">
            <Button @click="fetchAssignments" :loading="assignmentsLoading">
              <template #icon><ReloadOutlined /></template>
              Refresh
            </Button>
            <Button type="primary" @click="openAssignmentModal">
              <template #icon><PlusOutlined /></template>
              Assign to Role
            </Button>
          </div>

          <Spin :spinning="assignmentsLoading">
            <Table
              :columns="assignmentColumns"
              :dataSource="assignments"
              :pagination="false"
              rowKey="id"
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'profile_name'">
                  <div class="flex items-center">
                    <LockOutlined class="mr-2 text-blue-500" />
                    {{ record.profile_name || `Profile ${record.profile_id}` }}
                  </div>
                </template>
                <template v-else-if="column.key === 'role_name'">
                  <div class="flex items-center">
                    <TeamOutlined class="mr-2 text-green-500" />
                    {{ record.role_name || `Role ${record.role_id}` }}
                  </div>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <Popconfirm title="Remove this assignment?" @confirm="deleteAssignment(record)" okType="danger">
                    <Tooltip title="Remove">
                      <Button type="text" size="small" danger>
                        <template #icon><DeleteOutlined /></template>
                      </Button>
                    </Tooltip>
                  </Popconfirm>
                </template>
              </template>
            </Table>
          </Spin>
        </TabPane>

        <!-- User Overrides Tab -->
        <TabPane key="overrides" tab="User Overrides">
          <div class="mb-4 flex justify-between">
            <Button @click="fetchOverrides" :loading="overridesLoading">
              <template #icon><ReloadOutlined /></template>
              Refresh
            </Button>
            <Button type="primary" @click="openCreateOverrideModal">
              <template #icon><PlusOutlined /></template>
              New Override
            </Button>
          </div>

          <Alert
            class="mb-4"
            type="warning"
            show-icon
            message="User overrides take precedence over profile-based security. Use sparingly for temporary exceptions."
          />

          <Spin :spinning="overridesLoading">
            <Table
              :columns="overrideColumns"
              :dataSource="overrides"
              :pagination="overridesPagination"
              @change="(pag) => { overridesPagination.current = pag.current; fetchOverrides(); }"
              rowKey="id"
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'user_name'">
                  <div class="flex items-center">
                    <UserOutlined class="mr-2" />
                    {{ record.user_name || `User ${record.user_id}` }}
                  </div>
                </template>
                <template v-else-if="column.key === 'access_level'">
                  <Tag :color="getAccessLevelConfig(record.access_level).color">
                    {{ getAccessLevelConfig(record.access_level).label }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'valid_from' || column.key === 'valid_until'">
                  <span v-if="record[column.key]">{{ record[column.key].split('T')[0] }}</span>
                  <span v-else class="text-gray-400">-</span>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <Space>
                    <Tooltip title="Edit">
                      <Button type="text" size="small" @click="openEditOverrideModal(record)">
                        <template #icon><EditOutlined /></template>
                      </Button>
                    </Tooltip>
                    <Popconfirm title="Delete this override?" @confirm="deleteOverride(record)" okType="danger">
                      <Tooltip title="Delete">
                        <Button type="text" size="small" danger>
                          <template #icon><DeleteOutlined /></template>
                        </Button>
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                </template>
              </template>
            </Table>
          </Spin>
        </TabPane>
      </Tabs>
    </Card>

    <!-- Profile Modal -->
    <Modal
      v-model:open="profileModalVisible"
      :title="isEditingProfile ? 'Edit Profile' : 'New Profile'"
      @ok="saveProfile"
      width="500px"
    >
      <Form layout="vertical" class="mt-4">
        <FormItem label="Name" required>
          <Input v-model:value="profileForm.name" placeholder="Enter profile name" />
        </FormItem>
        <FormItem label="Code">
          <Input v-model:value="profileForm.code" placeholder="Auto-generated from name" />
        </FormItem>
        <FormItem label="Description">
          <Textarea v-model:value="profileForm.description" :rows="3" placeholder="Describe this profile" />
        </FormItem>
        <FormItem label="Status">
          <Switch v-model:checked="profileForm.is_active" />
          <span class="ml-2">{{ profileForm.is_active ? 'Active' : 'Inactive' }}</span>
        </FormItem>
      </Form>
    </Modal>

    <!-- Rule Modal -->
    <Modal
      v-model:open="ruleModalVisible"
      :title="isEditingRule ? 'Edit Rule' : 'New Rule'"
      @ok="saveRule"
      width="600px"
    >
      <Form layout="vertical" class="mt-4">
        <div class="grid grid-cols-2 gap-4">
          <FormItem label="Profile" required>
            <Select
              v-model:value="ruleForm.profile_id"
              placeholder="Select profile"
              :options="profileOptions"
            />
          </FormItem>
          <FormItem label="Model" required>
            <Select
              v-model:value="ruleForm.model_name"
              placeholder="Select model"
              :options="availableModels"
            />
          </FormItem>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <FormItem label="Field Name" required>
            <Input v-model:value="ruleForm.field_name" placeholder="e.g., salary, ssn" />
          </FormItem>
          <FormItem label="Access Level" required>
            <Select v-model:value="ruleForm.access_level" :options="accessLevelOptions" />
          </FormItem>
        </div>

        <FormItem label="Masking">
          <Select v-model:value="ruleForm.mask_type" :options="maskTypeOptions" />
        </FormItem>

        <template v-if="ruleForm.mask_type === 'show_first' || ruleForm.mask_type === 'show_last'">
          <FormItem label="Characters to Show">
            <InputNumber v-model:value="ruleForm.mask_characters" :min="1" :max="20" />
          </FormItem>
        </template>

        <template v-if="ruleForm.mask_type === 'pattern'">
          <FormItem label="Mask Pattern">
            <Input v-model:value="ruleForm.mask_pattern" placeholder="e.g., ***-**-####" />
            <div class="text-xs text-gray-400 mt-1">Use # for visible digits, * for masked characters</div>
          </FormItem>
        </template>
      </Form>
    </Modal>

    <!-- Assignment Modal -->
    <Modal
      v-model:open="assignmentModalVisible"
      title="Assign Profile to Role"
      @ok="saveAssignment"
      width="500px"
    >
      <Form layout="vertical" class="mt-4">
        <FormItem label="Profile" required>
          <Select
            v-model:value="assignmentForm.profile_id"
            placeholder="Select profile"
            :options="profileOptions"
          />
        </FormItem>
        <FormItem label="Role" required>
          <Select
            v-model:value="assignmentForm.role_id"
            placeholder="Select role"
            :options="availableRoles"
          />
        </FormItem>
        <FormItem label="Priority">
          <InputNumber
            v-model:value="assignmentForm.priority"
            :min="1"
            :max="100"
            style="width: 100%"
          />
          <div class="text-xs text-gray-400 mt-1">Lower numbers have higher priority</div>
        </FormItem>
      </Form>
    </Modal>

    <!-- Override Modal -->
    <Modal
      v-model:open="overrideModalVisible"
      :title="isEditingOverride ? 'Edit Override' : 'New Override'"
      @ok="saveOverride"
      width="600px"
    >
      <Form layout="vertical" class="mt-4">
        <FormItem label="User ID" required>
          <InputNumber
            v-model:value="overrideForm.user_id"
            :min="1"
            style="width: 100%"
            placeholder="Enter user ID"
          />
        </FormItem>

        <div class="grid grid-cols-2 gap-4">
          <FormItem label="Model" required>
            <Select
              v-model:value="overrideForm.model_name"
              placeholder="Select model"
              :options="availableModels"
            />
          </FormItem>
          <FormItem label="Field Name" required>
            <Input v-model:value="overrideForm.field_name" placeholder="e.g., salary" />
          </FormItem>
        </div>

        <FormItem label="Access Level" required>
          <Select v-model:value="overrideForm.access_level" :options="accessLevelOptions" />
        </FormItem>

        <div class="grid grid-cols-2 gap-4">
          <FormItem label="Valid From">
            <DatePicker
              v-model:value="overrideForm.valid_from"
              style="width: 100%"
              placeholder="Start date (optional)"
            />
          </FormItem>
          <FormItem label="Valid Until">
            <DatePicker
              v-model:value="overrideForm.valid_until"
              style="width: 100%"
              placeholder="End date (optional)"
            />
          </FormItem>
        </div>

        <FormItem label="Reason">
          <Textarea
            v-model:value="overrideForm.reason"
            :rows="2"
            placeholder="Document why this override is needed"
          />
        </FormItem>
      </Form>
    </Modal>
  </Page>
</template>
