<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Checkbox,
  Form,
  FormItem,
  Input,
  Modal,
  Popconfirm,
  Select,
  SelectOption,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';

import { useNotification } from '#/composables';
import {
  getProfilesApi,
  deleteProfileApi,
  cloneProfileApi,
  getProfileObjectPermissionsApi,
  setProfileObjectPermissionApi,
  PROFILE_TYPES,
  getProfileTypeConfig,
} from '#/api/base_security';

defineOptions({
  name: 'BaseProfiles',
});

const router = useRouter();
const { success: showSuccess, error: showError } = useNotification();

const loading = ref(false);
const actionLoading = ref(false);
const profiles = ref([]);
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
});

const filters = ref({
  profile_type: null,
  is_active: null,
});


// Clone modal
const cloneModalVisible = ref(false);
const cloneSource = ref(null);
const cloneForm = ref({
  name: '',
  api_name: '',
});

// Object Permissions modal
const permissionsModalVisible = ref(false);
const selectedProfile = ref(null);
const objectPermissions = ref([]);
const permissionsLoading = ref(false);


const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 200, ellipsis: true },
  { title: 'API Name', dataIndex: 'api_name', key: 'api_name', width: 180, ellipsis: true },
  { title: 'Type', key: 'profile_type', width: 120 },
  { title: 'Active', key: 'is_active', width: 80, align: 'center' },
  { title: 'System', key: 'is_system', width: 80, align: 'center' },
  { title: 'Session Timeout', dataIndex: 'session_timeout_minutes', key: 'timeout', width: 130 },
  { title: 'Actions', key: 'actions', width: 200, fixed: 'right' },
];

const permissionColumns = [
  { title: 'Object', dataIndex: 'object_name', key: 'object_name', width: 200 },
  { title: 'Create', key: 'can_create', width: 80, align: 'center' },
  { title: 'Read', key: 'can_read', width: 80, align: 'center' },
  { title: 'Edit', key: 'can_edit', width: 80, align: 'center' },
  { title: 'Delete', key: 'can_delete', width: 80, align: 'center' },
  { title: 'View All', key: 'can_view_all', width: 90, align: 'center' },
  { title: 'Modify All', key: 'can_modify_all', width: 100, align: 'center' },
];

async function fetchProfiles() {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.current,
      page_size: pagination.value.pageSize,
    };
    if (filters.value.profile_type) params.profile_type = filters.value.profile_type;
    if (filters.value.is_active !== null) params.is_active = filters.value.is_active;

    const res = await getProfilesApi(params);
    profiles.value = res.items || res || [];
    pagination.value.total = res.total || profiles.value.length;
  } catch (err) {
    console.error('Failed to fetch profiles:', err);
    showError('Failed to load profiles');
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchProfiles();
}

watch(filters, () => {
  pagination.value.current = 1;
  fetchProfiles();
}, { deep: true });

function openCreateForm() {
  router.push('/base_security/profiles-form');
}

function openEditForm(record) {
  router.push(`/base_security/profiles-form?id=${record.id}`);
}

async function handleDelete(record) {
  if (record.is_system) {
    showError('System profiles cannot be deleted');
    return;
  }

  actionLoading.value = true;
  try {
    await deleteProfileApi(record.id);
    showSuccess('Profile deleted successfully');
    fetchProfiles();
  } catch (err) {
    console.error('Failed to delete profile:', err);
    showError(err.response?.data?.detail || 'Failed to delete profile');
  } finally {
    actionLoading.value = false;
  }
}

function openCloneModal(record) {
  cloneSource.value = record;
  cloneForm.value = {
    name: record.name + ' (Copy)',
    api_name: record.api_name + '_copy',
  };
  cloneModalVisible.value = true;
}

async function handleClone() {
  if (!cloneForm.value.name.trim()) {
    showError('New profile name is required');
    return;
  }
  if (!cloneForm.value.api_name.trim()) {
    showError('New API name is required');
    return;
  }

  actionLoading.value = true;
  try {
    await cloneProfileApi(cloneSource.value.id, cloneForm.value);
    showSuccess('Profile cloned successfully');
    cloneModalVisible.value = false;
    fetchProfiles();
  } catch (err) {
    console.error('Failed to clone profile:', err);
    showError(err.response?.data?.detail || 'Failed to clone profile');
  } finally {
    actionLoading.value = false;
  }
}

async function openPermissionsModal(record) {
  selectedProfile.value = record;
  permissionsLoading.value = true;
  permissionsModalVisible.value = true;

  try {
    const res = await getProfileObjectPermissionsApi(record.id);
    objectPermissions.value = res || [];
  } catch (err) {
    console.error('Failed to fetch permissions:', err);
    showError('Failed to load object permissions');
    objectPermissions.value = [];
  } finally {
    permissionsLoading.value = false;
  }
}

async function handlePermissionChange(record, field, value) {
  if (selectedProfile.value?.is_system) {
    showError('System profile permissions cannot be modified');
    return;
  }

  try {
    const updateData = { [field]: value };
    await setProfileObjectPermissionApi(selectedProfile.value.id, record.object_name, updateData);
    // Update local state
    const idx = objectPermissions.value.findIndex(p => p.object_name === record.object_name);
    if (idx >= 0) {
      objectPermissions.value[idx][field] = value;
    }
    showSuccess('Permission updated');
  } catch (err) {
    console.error('Failed to update permission:', err);
    showError(err.response?.data?.detail || 'Failed to update permission');
    // Revert local change on error
    await openPermissionsModal(selectedProfile.value);
  }
}

onMounted(() => {
  fetchProfiles();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading || actionLoading">
      <Card>
        <template #title>
          <Space>
            <UserOutlined />
            <span>Profiles</span>
          </Space>
        </template>
        <template #extra>
          <Space>
            <Button type="primary" @click="openCreateForm">
              <PlusOutlined /> New Profile
            </Button>
            <Button @click="fetchProfiles">
              <ReloadOutlined /> Refresh
            </Button>
          </Space>
        </template>

        <!-- Filters -->
        <div class="filters-row">
          <Space wrap>
            <Select
              v-model:value="filters.profile_type"
              placeholder="Filter by type"
              allow-clear
              style="width: 160px"
            >
              <SelectOption v-for="t in PROFILE_TYPES" :key="t.value" :value="t.value">
                {{ t.label }}
              </SelectOption>
            </Select>
            <Select
              v-model:value="filters.is_active"
              placeholder="Filter by status"
              allow-clear
              style="width: 140px"
            >
              <SelectOption :value="true">Active</SelectOption>
              <SelectOption :value="false">Inactive</SelectOption>
            </Select>
          </Space>
        </div>

        <Table
          :columns="columns"
          :data-source="profiles"
          :pagination="{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} profiles`,
          }"
          :scroll="{ x: 1100 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'profile_type'">
              <Tag :color="getProfileTypeConfig(record.profile_type).color">
                {{ getProfileTypeConfig(record.profile_type).label }}
              </Tag>
            </template>
            <template v-if="column.key === 'is_active'">
              <CheckCircleOutlined v-if="record.is_active" style="color: #52c41a" />
              <CloseCircleOutlined v-else style="color: #ff4d4f" />
            </template>
            <template v-if="column.key === 'is_system'">
              <Tag v-if="record.is_system" color="purple">System</Tag>
              <span v-else>-</span>
            </template>
            <template v-if="column.key === 'timeout'">
              {{ record.session_timeout_minutes ? record.session_timeout_minutes + ' min' : '-' }}
            </template>
            <template v-if="column.key === 'actions'">
              <Space>
                <Tooltip title="Object Permissions">
                  <Button size="small" @click="openPermissionsModal(record)">
                    <KeyOutlined />
                  </Button>
                </Tooltip>
                <Tooltip title="Edit">
                  <Button size="small" @click="openEditForm(record)">
                    <EditOutlined />
                  </Button>
                </Tooltip>
                <Tooltip title="Clone">
                  <Button size="small" @click="openCloneModal(record)">
                    <CopyOutlined />
                  </Button>
                </Tooltip>
                <Popconfirm
                  title="Are you sure you want to delete this profile?"
                  @confirm="handleDelete(record)"
                  ok-text="Delete"
                  cancel-text="Cancel"
                  :disabled="record.is_system"
                >
                  <Tooltip title="Delete">
                    <Button size="small" danger :disabled="record.is_system">
                      <DeleteOutlined />
                    </Button>
                  </Tooltip>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </Card>
    </Spin>

    <!-- Clone Modal -->
    <Modal
      v-model:open="cloneModalVisible"
      title="Clone Profile"
      @ok="handleClone"
      :confirm-loading="actionLoading"
      width="500px"
    >
      <Form layout="vertical">
        <div class="clone-source">
          Cloning from: <strong>{{ cloneSource?.name }}</strong>
        </div>
        <FormItem label="New Profile Name" required>
          <Input
            v-model:value="cloneForm.name"
            placeholder="New profile name"
          />
        </FormItem>
        <FormItem label="New API Name" required>
          <Input
            v-model:value="cloneForm.api_name"
            placeholder="new_api_name"
          />
        </FormItem>
      </Form>
    </Modal>

    <!-- Object Permissions Modal -->
    <Modal
      v-model:open="permissionsModalVisible"
      :title="'Object Permissions: ' + (selectedProfile?.name || '')"
      :footer="null"
      width="900px"
    >
      <Spin :spinning="permissionsLoading">
        <div v-if="selectedProfile?.is_system" class="system-warning">
          System profile permissions are read-only.
        </div>
        <Table
          :columns="permissionColumns"
          :data-source="objectPermissions"
          :pagination="{ pageSize: 15 }"
          :scroll="{ y: 400 }"
          row-key="object_name"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'can_create'">
              <Checkbox
                :checked="record.can_create"
                @change="e => handlePermissionChange(record, 'can_create', e.target.checked)"
                :disabled="selectedProfile?.is_system"
              />
            </template>
            <template v-if="column.key === 'can_read'">
              <Checkbox
                :checked="record.can_read"
                @change="e => handlePermissionChange(record, 'can_read', e.target.checked)"
                :disabled="selectedProfile?.is_system"
              />
            </template>
            <template v-if="column.key === 'can_edit'">
              <Checkbox
                :checked="record.can_edit"
                @change="e => handlePermissionChange(record, 'can_edit', e.target.checked)"
                :disabled="selectedProfile?.is_system"
              />
            </template>
            <template v-if="column.key === 'can_delete'">
              <Checkbox
                :checked="record.can_delete"
                @change="e => handlePermissionChange(record, 'can_delete', e.target.checked)"
                :disabled="selectedProfile?.is_system"
              />
            </template>
            <template v-if="column.key === 'can_view_all'">
              <Checkbox
                :checked="record.can_view_all"
                @change="e => handlePermissionChange(record, 'can_view_all', e.target.checked)"
                :disabled="selectedProfile?.is_system"
              />
            </template>
            <template v-if="column.key === 'can_modify_all'">
              <Checkbox
                :checked="record.can_modify_all"
                @change="e => handlePermissionChange(record, 'can_modify_all', e.target.checked)"
                :disabled="selectedProfile?.is_system"
              />
            </template>
          </template>
        </Table>
      </Spin>
    </Modal>
  </Page>
</template>

<style scoped>
.filters-row {
  margin-bottom: 16px;
}

.clone-source {
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 16px;
}

.system-warning {
  padding: 12px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 4px;
  margin-bottom: 16px;
  color: #d46b08;
}
</style>
