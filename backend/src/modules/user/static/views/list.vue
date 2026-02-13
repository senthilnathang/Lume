<script setup>
import { ref, onMounted, computed } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Table,
  Tag,
  Space,
  Input,
  Select,
  SelectOption,
  Avatar,
  Dropdown,
  Menu,
  MenuItem,
  Modal,
  Form,
  FormItem,
  Input as AntInput,
  message,
  Spin,
  Row,
  Col,
} from 'ant-design-vue';

import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  UserOutlined,
  LockOutlined,
} from '@ant-design/icons-vue';

defineOptions({
  name: 'UsersList',
});

const loading = ref(false);
const saving = ref(false);
const searchText = ref('');
const statusFilter = ref(null);
const users = ref([]);
const modalVisible = ref(false);
const editingUser = ref(null);

const columns = [
  { title: 'User', key: 'user', width: 280 },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { title: 'Role', dataIndex: 'role_id', key: 'role_id', width: 120 },
  { title: 'Status', dataIndex: 'is_active', key: 'is_active', width: 100 },
  { title: 'Last Login', dataIndex: 'last_login', key: 'last_login', width: 150 },
  { title: 'Actions', key: 'actions', width: 80 },
];

const formState = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role_id: 5,
  is_active: true,
  password: '',
});

const roles = [
  { id: 1, name: 'Super Admin' },
  { id: 2, name: 'Admin' },
  { id: 3, name: 'Manager' },
  { id: 4, name: 'Staff' },
  { id: 5, name: 'User' },
];

const filteredUsers = computed(() => {
  return users.value.filter((user) => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const matchesSearch =
      !searchText.value ||
      fullName.includes(searchText.value.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchText.value.toLowerCase()));
    const matchesStatus = statusFilter.value === null || user.is_active === (statusFilter.value === 'active');
    return matchesSearch && matchesStatus;
  });
});

function getInitials(firstName, lastName) {
  const first = firstName ? firstName[0] : '';
  const last = lastName ? lastName[0] : '';
  return (first + last).toUpperCase();
}

function getStatusColor(isActive) {
  return isActive ? 'success' : 'default';
}

function getRoleName(roleId) {
  const role = roles.find(r => r.id === roleId);
  return role ? role.name : `Role ${roleId}`;
}

function getRoleColor(roleId) {
  const colors = { 1: 'red', 2: 'orange', 3: 'purple', 4: 'blue', 5: 'green' };
  return colors[roleId] || 'default';
}

async function loadUsers() {
  loading.value = true;
  try {
    const token = localStorage.getItem('accessToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch('/api/users', { headers });
    const result = await response.json();
    
    if (result.data) {
      users.value = result.data;
    }
  } catch (error) {
    console.error('Failed to load users:', error);
    message.error('Failed to load users');
  } finally {
    loading.value = false;
  }
}

function openModal(user = null) {
  editingUser.value = user;
  if (user) {
    formState.value = {
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      role_id: user.role_id || 5,
      is_active: user.is_active !== false,
      password: '',
    };
  } else {
    formState.value = {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role_id: 5,
      is_active: true,
      password: '',
    };
  }
  modalVisible.value = true;
}

function closeModal() {
  modalVisible.value = false;
  editingUser.value = null;
}

async function handleSave() {
  saving.value = true;
  try {
    const token = localStorage.getItem('accessToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let url = '/api/users';
    let method = 'POST';

    if (editingUser.value && editingUser.value.id) {
      url = `/api/users/${editingUser.value.id}`;
      method = 'PUT';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(formState.value),
    });

    const result = await response.json();

    if (result.success || response.ok) {
      message.success(editingUser.value ? 'User updated successfully' : 'User created successfully');
      closeModal();
      await loadUsers();
    } else {
      message.error(result.error || 'Failed to save user');
    }
  } catch (error) {
    console.error('Failed to save user:', error);
    message.error('Failed to save user');
  } finally {
    saving.value = false;
  }
}

function handleViewProfile(user) {
  message.info(`View profile: ${user.first_name} ${user.last_name}`);
}

function handleResetPassword(user) {
  message.info(`Reset password for: ${user.email}`);
}

async function handleDelete(user) {
  Modal.confirm({
    title: 'Delete User',
    content: `Are you sure you want to delete ${user.first_name} ${user.last_name}?`,
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        const token = localStorage.getItem('accessToken');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`/api/users/${user.id}`, {
          method: 'DELETE',
          headers,
        });

        const result = await response.json();

        if (result.success || response.ok) {
          message.success('User deleted successfully');
          await loadUsers();
        } else {
          message.error(result.error || 'Failed to delete user');
        }
      } catch (error) {
        message.error('Failed to delete user');
      }
    },
  });
}

onMounted(() => {
  loadUsers();
});
</script>

<template>
  <Page title="Users" description="Manage user accounts">
    <Spin :spinning="loading">
      <Card>
        <div class="flex justify-between items-center mb-4">
          <Space>
            <Input
              v-model:value="searchText"
              placeholder="Search users..."
              style="width: 250px"
              allow-clear
            >
              <template #prefix>
                <SearchOutlined />
              </template>
            </Input>
            <Select
              v-model:value="statusFilter"
              placeholder="All Status"
              style="width: 150px"
              allow-clear
            >
              <SelectOption value="active">Active</SelectOption>
              <SelectOption value="inactive">Inactive</SelectOption>
            </Select>
          </Space>
          <Button type="primary" @click="openModal()">
            <PlusOutlined />
            Add User
          </Button>
        </div>

        <Table
          :data-source="filteredUsers"
          :columns="columns"
          :row-key="(record) => record.id"
          :pagination="{ pageSize: 10 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'user'">
              <Space>
                <Avatar :style="{ backgroundColor: '#1890ff' }">
                  {{ getInitials(record.first_name, record.last_name) }}
                </Avatar>
                <div>
                  <div class="font-medium">{{ record.first_name }} {{ record.last_name }}</div>
                </div>
              </Space>
            </template>
            <template v-else-if="column.key === 'role_id'">
              <Tag :color="getRoleColor(record.role_id)">{{ getRoleName(record.role_id) }}</Tag>
            </template>
            <template v-else-if="column.key === 'is_active'">
              <Tag :color="getStatusColor(record.is_active)">
                {{ record.is_active ? 'Active' : 'Inactive' }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <Dropdown>
                <template #overlay>
                  <Menu>
                    <MenuItem key="view" @click="handleViewProfile(record)">
                      <UserOutlined /> View Profile
                    </MenuItem>
                    <MenuItem key="edit" @click="openModal(record)">
                      <EditOutlined /> Edit
                    </MenuItem>
                    <MenuItem key="reset" @click="handleResetPassword(record)">
                      <LockOutlined /> Reset Password
                    </MenuItem>
                    <MenuItem key="delete" danger @click="handleDelete(record)">
                      <DeleteOutlined /> Delete
                    </MenuItem>
                  </Menu>
                </template>
                <Button type="text">
                  <MoreOutlined />
                </Button>
              </Dropdown>
            </template>
          </template>
        </Table>
      </Card>

      <Modal
        v-model:open="modalVisible"
        :title="editingUser ? 'Edit User' : 'Create User'"
        @ok="handleSave"
        :confirm-loading="saving"
        width="600px"
      >
        <Form layout="vertical">
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="First Name" required>
                <AntInput v-model:value="formState.first_name" placeholder="First name" />
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Last Name" required>
                <AntInput v-model:value="formState.last_name" placeholder="Last name" />
              </FormItem>
            </Col>
          </Row>
          <FormItem label="Email" required>
            <AntInput v-model:value="formState.email" placeholder="Email" :disabled="!!editingUser" />
          </FormItem>
          <FormItem label="Phone">
            <AntInput v-model:value="formState.phone" placeholder="Phone number" />
          </FormItem>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Role">
                <Select v-model:value="formState.role_id" placeholder="Select role">
                  <SelectOption v-for="role in roles" :key="role.id" :value="role.id">
                    {{ role.name }}
                  </SelectOption>
                </Select>
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Active">
                <Switch v-model:checked="formState.is_active" />
              </FormItem>
            </Col>
          </Row>
          <FormItem v-if="!editingUser" label="Password" required>
            <AntInput v-model:value="formState.password" type="password" placeholder="Password" />
          </FormItem>
        </Form>
      </Modal>
    </Spin>
  </Page>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}

.font-medium {
  font-weight: 500;
}
</style>
