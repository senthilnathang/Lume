<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Avatar,
  Button,
  Card,
  Col,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  // Pagination,
  Popconfirm,
  Row,
  Select,
  SelectOption,
  Space,
  // Switch,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CrownOutlined,
  EditOutlined,
  EyeOutlined,
  KeyOutlined,
  // MailOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';

import {
  // deleteUserApi,
  getUserApi,
  getUsersApi,
  toggleUserActiveApi,
  updateUserApi,
  type UserApi,
} from '#/api/user';

defineOptions({
  name: 'UserSettings',
});

const router = useRouter();

// Pagination
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total: number) => `Total ${total} users`,
});

// State
const loading = ref(false);
const users = ref<UserApi.User[]>([]);
const searchText = ref('');
const statusFilter = ref<any>(undefined);

// Modal state
const modalVisible = ref(false);
const modalLoading = ref(false);
const selectedUser = ref<UserApi.User | null>(null);

// Password modal
const passwordModalVisible = ref(false);
const passwordForm = ref({
  password: '',
  confirm_password: '',
});

// Table columns
const columns = computed(() => [
  { title: '', key: 'avatar', width: 60 },
  { title: 'Username', dataIndex: 'username', key: 'username', sorter: true },
  { title: 'Name', key: 'name' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { title: 'Role', key: 'role', width: 150 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Last Login', key: 'last_login', width: 150 },
  { title: 'Actions', key: 'actions', width: 180, fixed: 'right' as const },
]);

// Methods
async function fetchUsers() {
  loading.value = true;
  try {
    const params: UserApi.ListParams = {
      page: pagination.value.current,
      page_size: pagination.value.pageSize,
      search: searchText.value || undefined,
      is_active: statusFilter.value,
    };
    const response = await getUsersApi(params);
    users.value = response.items || [];
    pagination.value.total = response.total || 0;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    message.error('Failed to load users');
  } finally {
    loading.value = false;
  }
}

function onTableChange(pag: any) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchUsers();
}

function handleSearch() {
  pagination.value.current = 1;
  fetchUsers();
}

function handleStatusFilter(status: any) {
  statusFilter.value = status;
  pagination.value.current = 1;
  fetchUsers();
}

function openCreateModal() {
  router.push({ name: 'UserCreate' });
}

function navigateToEdit(record: UserApi.User) {
  router.push({ name: 'UserEdit', params: { id: record.id } });
}

async function openViewModal(record: UserApi.User) {
  modalLoading.value = true;
  modalVisible.value = true;
  try {
    const user = await getUserApi(record.id);
    selectedUser.value = user;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    message.error('Failed to load user details');
    modalVisible.value = false;
  } finally {
    modalLoading.value = false;
  }
}

// async function handleDelete(record: UserApi.User) {
//   try {
//     await deleteUserApi(record.id);
//     message.success('User deleted successfully');
//     fetchUsers();
//   } catch (error) {
//     console.error('Failed to delete user:', error);
//     message.error('Failed to delete user');
//   }
// }

async function handleToggleActive(record: UserApi.User) {
  try {
    await toggleUserActiveApi(record.id, !record.is_active);
    message.success(`User ${record.is_active ? 'deactivated' : 'activated'} successfully`);
    fetchUsers();
  } catch (error) {
    console.error('Failed to toggle user status:', error);
    message.error('Failed to update user status');
  }
}

function openPasswordModal(record: UserApi.User) {
  selectedUser.value = record;
  passwordForm.value.password = '';
  passwordForm.value.confirm_password = '';
  passwordModalVisible.value = true;
}

async function handleChangePassword() {
  if (!passwordForm.value.password) {
    message.error('Please enter a password');
    return;
  }
  if (passwordForm.value.password !== passwordForm.value.confirm_password) {
    message.error('Passwords do not match');
    return;
  }
  if (passwordForm.value.password.length < 6) {
    message.error('Password must be at least 6 characters');
    return;
  }

  try {
    if (selectedUser.value) {
      await updateUserApi(selectedUser.value.id, { password: passwordForm.value.password } as any);
      message.success('Password changed successfully');
      passwordModalVisible.value = false;
    }
  } catch (error) {
    console.error('Failed to change password:', error);
    message.error('Failed to change password');
  }
}

function getFullName(user: UserApi.User) {
  return user.full_name || user.username;
}

function getInitials(user: UserApi.User) {
  const name = getFullName(user);
  return name.substring(0, 2).toUpperCase();
}

function getRoleTag(user: UserApi.User) {
  if (user.is_superuser) return { text: 'Super Admin', color: 'red' };
  if (user.is_verified) return { text: 'Verified', color: 'blue' };
  return { text: 'User', color: 'default' };
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

onMounted(() => {
  fetchUsers();
});
</script>

<template>
  <Page auto-content-height>
    <Card>
      <template #title>
        <div class="flex items-center justify-between">
          <span>User Management</span>
          <Space>
            <Input
              v-model:value="searchText"
              placeholder="Search users..."
              style="width: 250px"
              allow-clear
              @press-enter="handleSearch"
            >
              <template #prefix>
                <UserOutlined />
              </template>
            </Input>
            <Select
              v-model:value="statusFilter"
              placeholder="Filter by status"
              style="width: 150px"
              allow-clear
              @change="handleStatusFilter"
            >
              <SelectOption :value="true">Active</SelectOption>
              <SelectOption :value="false">Inactive</SelectOption>
            </Select>
            <Button @click="handleSearch">Search</Button>
            <Button @click="fetchUsers">Refresh</Button>
            <Button type="primary" @click="openCreateModal">
              <template #icon><PlusOutlined /></template>
              Add User
            </Button>
          </Space>
        </div>
      </template>

      <Table
        :columns="columns"
        :data-source="users"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1200 }"
        row-key="id"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'avatar'">
            <Avatar
              :size="40"
              :src="record.avatar_url"
              :style="{ backgroundColor: record.is_superuser ? '#f5222d' : record.is_verified ? '#1890ff' : '#52c41a' }"
            >
              {{ getInitials(record as any) }}
            </Avatar>
          </template>

          <template v-if="column.key === 'name'">
            <div>
              <div class="font-medium">{{ getFullName(record as any) }}</div>
              <div v-if="record.phone" class="text-xs text-gray-500">
                {{ record.phone }}
              </div>
            </div>
          </template>

          <template v-if="column.key === 'role'">
            <Space>
              <Tag :color="getRoleTag(record as any).color">{{ getRoleTag(record as any).text }}</Tag>
              <CrownOutlined v-if="record.is_superuser" class="text-yellow-500" />
            </Space>
          </template>

          <template v-if="column.key === 'status'">
            <Tag :color="record.is_active ? 'green' : 'red'">
              {{ record.is_active ? 'Active' : 'Inactive' }}
            </Tag>
          </template>

          <template v-if="column.key === 'last_login'">
            {{ formatDate(record.last_login_at) }}
          </template>

          <template v-if="column.key === 'actions'">
            <Space>
              <Tooltip title="View">
                <Button type="link" size="small" @click="openViewModal(record as any)">
                  <template #icon><EyeOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip title="Edit">
                <Button type="link" size="small" @click="navigateToEdit(record as any)">
                  <template #icon><EditOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip title="Change Password">
                <Button type="link" size="small" @click="openPasswordModal(record as any)">
                  <template #icon><KeyOutlined /></template>
                </Button>
              </Tooltip>
              <Popconfirm
                :title="`Are you sure you want to ${record.is_active ? 'deactivate' : 'activate'} this user?`"
                ok-text="Yes"
                cancel-text="No"
                @confirm="handleToggleActive(record as any)"
              >
                <Tooltip :title="record.is_active ? 'Deactivate' : 'Activate'">
                  <Button type="link" size="small" :danger="record.is_active">
                    <template #icon>
                      <CloseCircleOutlined v-if="record.is_active" />
                      <CheckCircleOutlined v-else />
                    </template>
                  </Button>
                </Tooltip>
              </Popconfirm>
            </Space>
          </template>
        </template>

        <template #emptyText>
          <div class="py-8 text-center">
            <UserOutlined class="mb-2 text-4xl text-gray-400" />
            <p class="text-gray-500">No users found</p>
            <Button type="primary" class="mt-4" @click="openCreateModal">
              Add First User
            </Button>
          </div>
        </template>
      </Table>
    </Card>

    <!-- View Modal -->
    <Modal
      v-model:open="modalVisible"
      title="User Details"
      :width="600"
      :footer="null"
      @cancel="modalVisible = false"
    >
      <template v-if="selectedUser">
        <div class="mb-6 flex items-center gap-4">
          <Avatar
            :size="72"
            :style="{ backgroundColor: selectedUser.is_superuser ? '#f5222d' : selectedUser.is_verified ? '#1890ff' : '#52c41a' }"
          >
            {{ selectedUser.username?.charAt(0)?.toUpperCase() }}
          </Avatar>
          <div>
            <h2 class="m-0 text-xl font-bold">
              {{ selectedUser.full_name || selectedUser.username }}
            </h2>
            <p class="text-gray-500">@{{ selectedUser.username }}</p>
            <Space class="mt-2">
              <Tag :color="selectedUser.is_active ? 'green' : 'red'">
                {{ selectedUser.is_active ? 'Active' : 'Inactive' }}
              </Tag>
              <Tag v-if="selectedUser.is_superuser" color="red">Super Admin</Tag>
              <Tag v-else-if="selectedUser.is_verified" color="blue">Verified</Tag>
              <Tag v-else color="default">User</Tag>
            </Space>
          </div>
        </div>

        <Row :gutter="[16, 16]">
          <Col :span="12">
            <div class="detail-item">
              <span class="detail-label">Email</span>
              <span class="detail-value">{{ selectedUser.email }}</span>
            </div>
          </Col>
          <Col :span="12">
            <div class="detail-item">
              <span class="detail-label">Username</span>
              <span class="detail-value">{{ selectedUser.username }}</span>
            </div>
          </Col>
          <Col :span="12">
            <div class="detail-item">
              <span class="detail-label">Created At</span>
              <span class="detail-value">{{ formatDate(selectedUser.created_at) }}</span>
            </div>
          </Col>
          <Col :span="12">
            <div class="detail-item">
              <span class="detail-label">Last Login</span>
              <span class="detail-value">{{ formatDate(selectedUser.last_login_at) }}</span>
            </div>
          </Col>
        </Row>
      </template>
    </Modal>

    <!-- Password Change Modal -->
    <Modal
      v-model:open="passwordModalVisible"
      title="Change Password"
      :width="400"
      @cancel="passwordModalVisible = false"
    >
      <Form layout="vertical">
        <FormItem label="New Password" required>
          <Input.Password v-model:value="passwordForm.password" placeholder="Enter new password" />
        </FormItem>
        <FormItem label="Confirm Password" required>
          <Input.Password v-model:value="passwordForm.confirm_password" placeholder="Confirm new password" />
        </FormItem>
      </Form>

      <template #footer>
        <Button @click="passwordModalVisible = false">Cancel</Button>
        <Button type="primary" @click="handleChangePassword">Change Password</Button>
      </template>
    </Modal>
  </Page>
</template>

<style scoped>
.detail-item {
  margin-bottom: 8px;
}

.detail-label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 4px;
}

.detail-value {
  display: block;
  font-size: 0.875rem;
  color: #1f2937;
}

:root.dark .detail-value {
  color: #f3f4f6;
}
</style>
