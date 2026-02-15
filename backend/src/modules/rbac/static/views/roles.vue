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
  Modal,
  Form,
  FormItem,
  Select,
  SelectOption,
  Checkbox,
  CheckboxGroup,
  Switch,
  Row,
  Col,
  message,
  Spin,
} from 'ant-design-vue';

import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue';

defineOptions({
  name: 'RbacRoles',
});

const loading = ref(false);
const saving = ref(false);
const searchText = ref('');
const roles = ref([]);
const permissions = ref([]);
const modalVisible = ref(false);
const editingRole = ref(null);

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Description', dataIndex: 'description', key: 'description' },
  { title: 'Permissions', key: 'permissions', width: 100 },
  { title: 'System', dataIndex: 'isSystem', key: 'isSystem', width: 80 },
  { title: 'Status', dataIndex: 'isActive', key: 'isActive', width: 80 },
  { title: 'Actions', key: 'actions', width: 100 },
];

const formState = ref({
  name: '',
  description: '',
  permissions: [],
  isActive: true,
});

const filteredRoles = computed(() => {
  return roles.value.filter((role) => {
    return (
      !searchText.value ||
      role.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
      (role.description && role.description.toLowerCase().includes(searchText.value.toLowerCase()))
    );
  });
});

function getPermissionCount(role) {
  if (role.permissions && role.permissions.includes('*')) return 'All';
  return role.permissions ? role.permissions.length : 0;
}

function getStatusColor(isActive) {
  return isActive ? 'success' : 'default';
}

async function loadData() {
  loading.value = true;
  try {
    const token = localStorage.getItem('accessToken');
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const [rolesRes, permsRes] = await Promise.all([
      fetch('/api/rbac/roles', { headers }),
      fetch('/api/rbac/permissions', { headers }),
    ]);

    const rolesData = await rolesRes.json();
    const permsData = await permsRes.json();

    roles.value = rolesData.data || rolesData || [];
    permissions.value = permsData.data || permsData || [];
  } catch (error) {
    console.error('Failed to load data:', error);
    message.error('Failed to load data');
  } finally {
    loading.value = false;
  }
}

function openModal(role = null) {
  editingRole.value = role;
  if (role) {
    formState.value = {
      name: role.name || '',
      description: role.description || '',
      permissions: role.permissions || [],
      isActive: role.isActive !== false,
    };
  } else {
    formState.value = {
      name: '',
      description: '',
      permissions: [],
      isActive: true,
    };
  }
  modalVisible.value = true;
}

function closeModal() {
  modalVisible.value = false;
  editingRole.value = null;
}

async function handleSave() {
  saving.value = true;
  try {
    const token = localStorage.getItem('accessToken');
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let url = '/api/rbac/roles';
    let method = 'POST';

    if (editingRole.value && editingRole.value.id) {
      url = `/api/rbac/roles/${editingRole.value.id}`;
      method = 'PUT';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(formState.value),
    });

    const result = await response.json();

    if (result.success || response.ok) {
      message.success(editingRole.value ? 'Role updated successfully' : 'Role created successfully');
      closeModal();
      await loadData();
    } else {
      message.error(result.error || 'Failed to save role');
    }
  } catch (error) {
    console.error('Failed to save role:', error);
    message.error('Failed to save role');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(role) {
  if (role.isSystem) {
    message.error('Cannot delete system role');
    return;
  }

  try {
    const token = localStorage.getItem('accessToken');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/rbac/roles/${role.id}`, {
      method: 'DELETE',
      headers,
    });

    const result = await response.json();

    if (result.success || response.ok) {
      message.success('Role deleted successfully');
      await loadData();
    } else {
      message.error(result.error || 'Failed to delete role');
    }
  } catch (error) {
    console.error('Failed to delete role:', error);
    message.error('Failed to delete role');
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page title="Roles" description="Manage user roles and permissions">
    <Spin :spinning="loading">
      <Card>
        <div class="flex justify-between items-center mb-4">
          <Input
            v-model:value="searchText"
            placeholder="Search roles..."
            style="width: 250px"
            allow-clear
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </Input>
          <Button type="primary" @click="openModal()">
            <PlusOutlined />
            Add Role
          </Button>
        </div>

        <Table
          :data-source="filteredRoles"
          :columns="columns"
          :row-key="(record) => record.id"
          :pagination="{ pageSize: 10 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'permissions'">
              <Tag color="blue">{{ getPermissionCount(record) }}</Tag>
            </template>
            <template v-else-if="column.key === 'isSystem'">
              <Tag :color="record.isSystem ? 'orange' : 'default'">
                {{ record.isSystem ? 'Yes' : 'No' }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'isActive'">
              <Tag :color="getStatusColor(record.isActive)">
                {{ record.isActive ? 'Active' : 'Inactive' }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="actions-cell flex items-center gap-1">
                <a-tooltip title="Edit">
                  <a-button type="text" size="small" @click="openModal(record)">
                    <template #icon><EditOutlined /></template>
                  </a-button>
                </a-tooltip>
                <a-popconfirm v-if="!record.isSystem" title="Delete this item?" ok-text="Delete" ok-type="danger" @confirm="handleDelete(record)">
                  <a-tooltip title="Delete">
                    <a-button type="text" size="small" danger>
                      <template #icon><DeleteOutlined /></template>
                    </a-button>
                  </a-tooltip>
                </a-popconfirm>
              </div>
            </template>
          </template>
        </Table>
      </Card>

      <Modal
        v-model:open="modalVisible"
        :title="editingRole ? 'Edit Role' : 'Create Role'"
        @ok="handleSave"
        :confirm-loading="saving"
        width="600px"
      >
        <Form layout="vertical">
          <FormItem label="Name" required>
            <Input v-model:value="formState.name" placeholder="Role name" />
          </FormItem>
          <FormItem label="Description">
            <Input v-model:value="formState.description" type="textarea" :rows="2" placeholder="Role description" />
          </FormItem>
          <FormItem label="Permissions">
            <CheckboxGroup v-model:value="formState.permissions" style="width: 100%">
              <Row :gutter="[16, 8]">
                <Col :span="12" v-for="perm in permissions" :key="perm.id">
                  <Checkbox :value="perm.code">{{ perm.name }}</Checkbox>
                </Col>
              </Row>
            </CheckboxGroup>
          </FormItem>
          <FormItem label="Active">
            <Switch v-model:checked="formState.isActive" />
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

:deep(.actions-cell .ant-btn) {
  opacity: 0.55;
  transition: opacity 0.15s;
}
:deep(.ant-table-row:hover .actions-cell .ant-btn) {
  opacity: 1;
}
</style>
