<template>
  <DataTable
    :title="title"
    :columns="columns"
    :data="users"
    :loading="loading"
    :total="total"
    :page-size="pageSize"
    :actions="['view', 'edit', 'delete']"
    @search="handleSearch"
    @sort="handleSort"
    @page="handlePage"
    @action="handleAction"
    @add="openAddModal"
  />

  <UserModal
    v-if="showModal"
    :user="selectedUser"
    :mode="modalMode"
    @close="closeModal"
    @save="handleSave"
  />
</template>

<script setup>
import { apiFetch, post, put, del } from '@/api/request';
import { ref, onMounted } from 'vue';
import DataTable from '@/components/DataTable.vue';
import UserModal from './UserModal.vue';

const title = 'User Management';
const loading = ref(false);
const users = ref([]);
const total = ref(0);
const pageSize = 10;
const page = ref(1);
const searchQuery = ref('');
const sortField = ref('created_at');
const sortOrder = ref('DESC');
const showModal = ref(false);
const selectedUser = ref(null);
const modalMode = ref('add');

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Role', sortable: true },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'last_login', label: 'Last Login', type: 'date' },
  { key: 'created_at', label: 'Joined', type: 'date' }
];

const fetchUsers = async () => {
  loading.value = true;
  try {
    const params = {
      page: page.value,
      limit: pageSize,
      order_by: sortField.value,
      order: sortOrder.value
    };
    if (searchQuery.value) {
      params.search = searchQuery.value;
    }
    
    const response = await apiFetch(`/api/users?${new URLSearchParams(params)}`);
    const data = await response.json();
    users.value = (data.data?.data || []).map(user => ({ ...user,
      name: `${user.firstName} ${user.lastName}`.trim(), role: user.role?.name,
      status: user.isActive ? 'active' : 'inactive', last_login: user.lastLogin, created_at: user.createdAt,
    }));
    total.value = data.data?.total || 0;
  } catch (error) {
    console.error('Failed to fetch users:', error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = (query) => {
  searchQuery.value = query;
  page.value = 1;
  fetchUsers();
};

const handleSort = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchUsers();
};

const handlePage = (newPage) => {
  page.value = newPage;
  fetchUsers();
};

const handleAction = (action, user) => {
  if (action === 'view') {
    selectedUser.value = user;
    modalMode.value = 'view';
    showModal.value = true;
  } else if (action === 'edit') {
    selectedUser.value = user;
    modalMode.value = 'edit';
    showModal.value = true;
  } else if (action === 'delete') {
    handleDelete(user);
  }
};

const openAddModal = () => {
  selectedUser.value = null;
  modalMode.value = 'add';
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  selectedUser.value = null;
};

const handleSave = async (userData) => {
  try {
    if (modalMode.value === 'add') {
      await post('/users', userData);
    } else {
      await put(`/users/${userData.id}`, userData);
    }
    closeModal();
    fetchUsers();
  } catch (error) {
    console.error('Failed to save user:', error);
  }
};

const handleDelete = async (user) => {
  if (!confirm(`Are you sure you want to delete ${user.name}?`)) return;
  
  try {
    await del(`/users/${user.id}`);
    fetchUsers();
  } catch (error) {
    console.error('Failed to delete user:', error);
  }
};

onMounted(() => {
  fetchUsers();
});
</script>
