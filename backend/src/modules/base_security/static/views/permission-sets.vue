<script setup>
import { onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  SelectOption,
  Space,
  Spin,
  Table,
  Tag,
  Textarea,
  Tooltip,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons-vue';

import { useNotification } from '#/composables';
import {
  getPermissionSetsApi,
  createPermissionSetApi,
  updatePermissionSetApi,
  deletePermissionSetApi,
  assignPermissionSetApi,
  revokePermissionSetApi,
  activatePermissionSetApi,
  deactivatePermissionSetApi,
  setPermissionSetObjectPermissionApi,
} from '#/api/base_security';

defineOptions({
  name: 'BasePermissionSets',
});

const { success: showSuccess, error: showError } = useNotification();

const loading = ref(false);
const actionLoading = ref(false);
const permissionSets = ref([]);
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
});

const filters = ref({
  is_active: null,
  has_session_activation: null,
});

// Create/Edit modal
const formModalVisible = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const psForm = ref({
  name: '',
  api_name: '',
  description: '',
  has_session_activation: false,
  session_timeout_minutes: null,
});

// Assign modal
const assignModalVisible = ref(false);
const selectedPS = ref(null);
const assignForm = ref({
  user_id: null,
  note: '',
  valid_from: null,
  valid_until: null,
});

// Assignments view modal
const assignmentsModalVisible = ref(false);
const assignments = ref([]);
const assignmentsLoading = ref(false);

// Object Permissions modal
const permissionsModalVisible = ref(false);
const objectPermissions = ref([]);
const permissionsLoading = ref(false);

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 200, ellipsis: true },
  { title: 'API Name', dataIndex: 'api_name', key: 'api_name', width: 180, ellipsis: true },
  { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Session Activation', key: 'has_session_activation', width: 150, align: 'center' },
  { title: 'Active', key: 'is_active', width: 80, align: 'center' },
  { title: 'Actions', key: 'actions', width: 220, fixed: 'right' },
];

const assignmentColumns = [
  { title: 'User ID', dataIndex: 'user_id', key: 'user_id', width: 100 },
  { title: 'Note', dataIndex: 'note', key: 'note', ellipsis: true },
  { title: 'Valid From', key: 'valid_from', width: 150 },
  { title: 'Valid Until', key: 'valid_until', width: 150 },
  { title: 'Actions', key: 'actions', width: 100 },
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

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString();
}

async function fetchPermissionSets() {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.current,
      page_size: pagination.value.pageSize,
    };
    if (filters.value.is_active !== null) params.is_active = filters.value.is_active;
    if (filters.value.has_session_activation !== null) params.has_session_activation = filters.value.has_session_activation;

    const res = await getPermissionSetsApi(params);
    permissionSets.value = res.items || res || [];
    pagination.value.total = res.total || permissionSets.value.length;
  } catch (err) {
    console.error('Failed to fetch permission sets:', err);
    showError('Failed to load permission sets');
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchPermissionSets();
}

watch(filters, () => {
  pagination.value.current = 1;
  fetchPermissionSets();
}, { deep: true });

function resetForm() {
  psForm.value = {
    name: '',
    api_name: '',
    description: '',
    has_session_activation: false,
    session_timeout_minutes: null,
  };
}

function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  resetForm();
  formModalVisible.value = true;
}

function openEditModal(record) {
  isEditing.value = true;
  editingId.value = record.id;
  psForm.value = {
    name: record.name,
    api_name: record.api_name,
    description: record.description || '',
    has_session_activation: record.has_session_activation || false,
    session_timeout_minutes: record.session_timeout_minutes || null,
  };
  formModalVisible.value = true;
}

function generateApiName(name) {
  if (!isEditing.value && name) {
    psForm.value.api_name = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
}

async function handleSave() {
  if (!psForm.value.name.trim()) {
    showError('Permission set name is required');
    return;
  }
  if (!psForm.value.api_name.trim()) {
    showError('API name is required');
    return;
  }

  actionLoading.value = true;
  try {
    if (isEditing.value) {
      await updatePermissionSetApi(editingId.value, psForm.value);
      showSuccess('Permission set updated successfully');
    } else {
      await createPermissionSetApi(psForm.value);
      showSuccess('Permission set created successfully');
    }
    formModalVisible.value = false;
    fetchPermissionSets();
  } catch (err) {
    console.error('Failed to save permission set:', err);
    showError(err.response?.data?.detail || 'Failed to save permission set');
  } finally {
    actionLoading.value = false;
  }
}

async function handleDelete(record) {
  actionLoading.value = true;
  try {
    await deletePermissionSetApi(record.id);
    showSuccess('Permission set deleted successfully');
    fetchPermissionSets();
  } catch (err) {
    console.error('Failed to delete permission set:', err);
    showError(err.response?.data?.detail || 'Failed to delete permission set');
  } finally {
    actionLoading.value = false;
  }
}

function openAssignModal(record) {
  selectedPS.value = record;
  assignForm.value = {
    user_id: null,
    note: '',
    valid_from: null,
    valid_until: null,
  };
  assignModalVisible.value = true;
}

async function handleAssign() {
  if (!assignForm.value.user_id) {
    showError('User ID is required');
    return;
  }

  actionLoading.value = true;
  try {
    await assignPermissionSetApi(selectedPS.value.id, assignForm.value);
    showSuccess('Permission set assigned successfully');
    assignModalVisible.value = false;
  } catch (err) {
    console.error('Failed to assign permission set:', err);
    showError(err.response?.data?.detail || 'Failed to assign permission set');
  } finally {
    actionLoading.value = false;
  }
}

function openAssignmentsModal(record) {
  selectedPS.value = record;
  assignments.value = record.assignments || [];
  assignmentsModalVisible.value = true;
}

async function handleRevoke(userId) {
  actionLoading.value = true;
  try {
    await revokePermissionSetApi(selectedPS.value.id, userId);
    showSuccess('Assignment revoked successfully');
    // Remove from local list
    assignments.value = assignments.value.filter(a => a.user_id !== userId);
  } catch (err) {
    console.error('Failed to revoke assignment:', err);
    showError(err.response?.data?.detail || 'Failed to revoke assignment');
  } finally {
    actionLoading.value = false;
  }
}

async function handleActivate(record) {
  actionLoading.value = true;
  try {
    await activatePermissionSetApi(record.id);
    showSuccess('Permission set activated for your session');
    fetchPermissionSets();
  } catch (err) {
    console.error('Failed to activate:', err);
    showError(err.response?.data?.detail || 'Failed to activate permission set');
  } finally {
    actionLoading.value = false;
  }
}

async function handleDeactivate(record) {
  actionLoading.value = true;
  try {
    await deactivatePermissionSetApi(record.id);
    showSuccess('Permission set deactivated');
    fetchPermissionSets();
  } catch (err) {
    console.error('Failed to deactivate:', err);
    showError(err.response?.data?.detail || 'Failed to deactivate permission set');
  } finally {
    actionLoading.value = false;
  }
}

async function openPermissionsModal(record) {
  selectedPS.value = record;
  permissionsLoading.value = true;
  permissionsModalVisible.value = true;
  objectPermissions.value = record.object_permissions || [];
  permissionsLoading.value = false;
}

async function handlePermissionChange(record, field, value) {
  try {
    const updateData = { [field]: value };
    await setPermissionSetObjectPermissionApi(selectedPS.value.id, record.object_name, updateData);
    const idx = objectPermissions.value.findIndex(p => p.object_name === record.object_name);
    if (idx >= 0) {
      objectPermissions.value[idx][field] = value;
    }
    showSuccess('Permission updated');
  } catch (err) {
    console.error('Failed to update permission:', err);
    showError(err.response?.data?.detail || 'Failed to update permission');
  }
}

onMounted(() => {
  fetchPermissionSets();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading || actionLoading">
      <Card>
        <template #title>
          <Space>
            <SafetyCertificateOutlined />
            <span>Permission Sets</span>
          </Space>
        </template>
        <template #extra>
          <Space>
            <Button type="primary" @click="openCreateModal">
              <PlusOutlined /> New Permission Set
            </Button>
            <Button @click="fetchPermissionSets">
              <ReloadOutlined /> Refresh
            </Button>
          </Space>
        </template>

        <!-- Filters -->
        <div class="filters-row">
          <Space wrap>
            <Select
              v-model:value="filters.is_active"
              placeholder="Filter by status"
              allow-clear
              style="width: 140px"
            >
              <SelectOption :value="true">Active</SelectOption>
              <SelectOption :value="false">Inactive</SelectOption>
            </Select>
            <Select
              v-model:value="filters.has_session_activation"
              placeholder="Session activation"
              allow-clear
              style="width: 180px"
            >
              <SelectOption :value="true">Session-based</SelectOption>
              <SelectOption :value="false">Standard</SelectOption>
            </Select>
          </Space>
        </div>

        <Table
          :columns="columns"
          :data-source="permissionSets"
          :pagination="{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} permission sets`,
          }"
          :scroll="{ x: 1100 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'has_session_activation'">
              <Tag v-if="record.has_session_activation" color="purple">
                Session-based
                <span v-if="record.session_timeout_minutes">
                  ({{ record.session_timeout_minutes }}m)
                </span>
              </Tag>
              <Tag v-else color="default">Standard</Tag>
            </template>
            <template v-if="column.key === 'is_active'">
              <CheckCircleOutlined v-if="record.is_active" style="color: #52c41a" />
              <CloseCircleOutlined v-else style="color: #ff4d4f" />
            </template>
            <template v-if="column.key === 'actions'">
              <Space>
                <Tooltip title="Object Permissions">
                  <Button size="small" @click="openPermissionsModal(record)">
                    <KeyOutlined />
                  </Button>
                </Tooltip>
                <Tooltip title="Assign to User">
                  <Button size="small" @click="openAssignModal(record)">
                    <UserAddOutlined />
                  </Button>
                </Tooltip>
                <Tooltip title="View Assignments">
                  <Button size="small" @click="openAssignmentsModal(record)">
                    <TeamOutlined />
                  </Button>
                </Tooltip>
                <Tooltip v-if="record.has_session_activation" title="Activate for Session">
                  <Button size="small" type="primary" ghost @click="handleActivate(record)">
                    Activate
                  </Button>
                </Tooltip>
                <Tooltip title="Edit">
                  <Button size="small" @click="openEditModal(record)">
                    <EditOutlined />
                  </Button>
                </Tooltip>
                <Popconfirm
                  title="Are you sure you want to delete this permission set?"
                  @confirm="handleDelete(record)"
                  ok-text="Delete"
                  cancel-text="Cancel"
                >
                  <Tooltip title="Delete">
                    <Button size="small" danger>
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

    <!-- Create/Edit Modal -->
    <Modal
      v-model:open="formModalVisible"
      :title="isEditing ? 'Edit Permission Set' : 'Create Permission Set'"
      @ok="handleSave"
      :confirm-loading="actionLoading"
      width="600px"
    >
      <Form layout="vertical">
        <FormItem label="Name" required>
          <Input
            v-model:value="psForm.name"
            placeholder="Permission set name"
            @input="generateApiName(psForm.name)"
          />
        </FormItem>
        <FormItem label="API Name" required>
          <Input
            v-model:value="psForm.api_name"
            placeholder="api_name"
            :disabled="isEditing"
          />
          <div class="help-text">Unique identifier. Cannot be changed after creation.</div>
        </FormItem>
        <FormItem label="Description">
          <Textarea
            v-model:value="psForm.description"
            :rows="3"
            placeholder="Permission set description..."
          />
        </FormItem>
        <FormItem>
          <Checkbox v-model:checked="psForm.has_session_activation">
            Enable Session-based Activation
          </Checkbox>
          <div class="help-text">
            When enabled, users can temporarily activate this permission set for their session.
          </div>
        </FormItem>
        <FormItem v-if="psForm.has_session_activation" label="Session Timeout (minutes)">
          <InputNumber
            v-model:value="psForm.session_timeout_minutes"
            :min="5"
            :max="480"
            placeholder="Optional timeout"
            style="width: 100%"
          />
          <div class="help-text">Leave empty for no automatic deactivation.</div>
        </FormItem>
      </Form>
    </Modal>

    <!-- Assign Modal -->
    <Modal
      v-model:open="assignModalVisible"
      :title="'Assign: ' + (selectedPS?.name || '')"
      @ok="handleAssign"
      :confirm-loading="actionLoading"
      width="500px"
    >
      <Form layout="vertical">
        <FormItem label="User ID" required>
          <InputNumber
            v-model:value="assignForm.user_id"
            placeholder="Enter user ID"
            style="width: 100%"
          />
        </FormItem>
        <FormItem label="Valid From">
          <DatePicker
            v-model:value="assignForm.valid_from"
            style="width: 100%"
            placeholder="Start date (optional)"
          />
        </FormItem>
        <FormItem label="Valid Until">
          <DatePicker
            v-model:value="assignForm.valid_until"
            style="width: 100%"
            placeholder="End date (optional)"
          />
        </FormItem>
        <FormItem label="Note">
          <Textarea
            v-model:value="assignForm.note"
            :rows="2"
            placeholder="Assignment note (optional)"
          />
        </FormItem>
      </Form>
    </Modal>

    <!-- Assignments View Modal -->
    <Modal
      v-model:open="assignmentsModalVisible"
      :title="'Assignments: ' + (selectedPS?.name || '')"
      :footer="null"
      width="700px"
    >
      <Table
        :columns="assignmentColumns"
        :data-source="assignments"
        :pagination="{ pageSize: 10 }"
        row-key="user_id"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'valid_from'">
            {{ formatDate(record.valid_from) }}
          </template>
          <template v-if="column.key === 'valid_until'">
            {{ formatDate(record.valid_until) }}
          </template>
          <template v-if="column.key === 'actions'">
            <Popconfirm
              title="Revoke this assignment?"
              @confirm="handleRevoke(record.user_id)"
              ok-text="Revoke"
              cancel-text="Cancel"
            >
              <Button size="small" danger>Revoke</Button>
            </Popconfirm>
          </template>
        </template>
      </Table>
      <div v-if="assignments.length === 0" class="empty-state">
        No assignments found
      </div>
    </Modal>

    <!-- Object Permissions Modal -->
    <Modal
      v-model:open="permissionsModalVisible"
      :title="'Object Permissions: ' + (selectedPS?.name || '')"
      :footer="null"
      width="900px"
    >
      <Spin :spinning="permissionsLoading">
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
              />
            </template>
            <template v-if="column.key === 'can_read'">
              <Checkbox
                :checked="record.can_read"
                @change="e => handlePermissionChange(record, 'can_read', e.target.checked)"
              />
            </template>
            <template v-if="column.key === 'can_edit'">
              <Checkbox
                :checked="record.can_edit"
                @change="e => handlePermissionChange(record, 'can_edit', e.target.checked)"
              />
            </template>
            <template v-if="column.key === 'can_delete'">
              <Checkbox
                :checked="record.can_delete"
                @change="e => handlePermissionChange(record, 'can_delete', e.target.checked)"
              />
            </template>
            <template v-if="column.key === 'can_view_all'">
              <Checkbox
                :checked="record.can_view_all"
                @change="e => handlePermissionChange(record, 'can_view_all', e.target.checked)"
              />
            </template>
            <template v-if="column.key === 'can_modify_all'">
              <Checkbox
                :checked="record.can_modify_all"
                @change="e => handlePermissionChange(record, 'can_modify_all', e.target.checked)"
              />
            </template>
          </template>
        </Table>
        <div v-if="objectPermissions.length === 0" class="empty-state">
          No object permissions configured
        </div>
      </Spin>
    </Modal>
  </Page>
</template>

<style scoped>
.filters-row {
  margin-bottom: 16px;
}

.help-text {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: #999;
}
</style>
