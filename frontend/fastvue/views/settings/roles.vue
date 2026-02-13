<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Col,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue';
import { useRouter } from 'vue-router';

import {
  deleteRoleApi,
  getRoleApi,
  getRolesApi,
  type RolesApi,
} from '#/api/roles';

defineOptions({
  name: 'RoleSettings',
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
  showTotal: (total: number) => `Total ${total} roles`,
});

// State
const loading = ref(false);
const showModal = ref(false);
const selectedRole = ref<RolesApi.RoleWithPermissions | null>(null);
const roles = ref<RolesApi.Role[]>([]);
const searchText = ref('');

const columns = computed(() => [
  {
    title: 'Role Name',
    dataIndex: 'name',
    key: 'name',
    width: 200,
  },
  {
    title: 'Codename',
    dataIndex: 'codename',
    key: 'codename',
    width: 150,
  },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
  },
  {
    title: 'Type',
    key: 'type',
    width: 120,
  },
  {
    title: 'Status',
    key: 'status',
    width: 100,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 150,
    fixed: 'right' as const,
  },
]);

const statistics = computed(() => {
  const totalRoles = pagination.value.total;
  const activeRoles = roles.value.filter(r => r.is_active).length;
  const systemRoles = roles.value.filter(r => r.is_system_role).length;

  return {
    totalRoles,
    activeRoles,
    systemRoles,
  };
});

async function fetchRoles() {
  loading.value = true;
  try {
    const response = await getRolesApi({
      page: pagination.value.current,
      page_size: pagination.value.pageSize,
    });
    roles.value = response.items || [];
    pagination.value.total = response.total || 0;
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    message.error('Failed to load roles');
  } finally {
    loading.value = false;
  }
}

function onTableChange(pag: any) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchRoles();
}

function handleSearch() {
  pagination.value.current = 1;
  fetchRoles();
}

async function openViewModal(record: RolesApi.Role) {
  try {
    const roleWithPermissions = await getRoleApi(record.id);
    selectedRole.value = roleWithPermissions;
    showModal.value = true;
  } catch (error) {
    console.error('Failed to fetch role details:', error);
    message.error('Failed to load role details');
  }
}

function handleCreate() {
  router.push('/settings/roles/create');
}

function handleEdit(record: RolesApi.Role) {
  router.push(`/settings/roles/${record.id}/edit`);
}

async function handleDelete(record: RolesApi.Role) {
  if (record.is_system_role) {
    message.warning('System roles cannot be deleted');
    return;
  }

  try {
    await deleteRoleApi(record.id);
    message.success('Role deleted successfully');
    fetchRoles();
  } catch (error) {
    console.error('Failed to delete role:', error);
    message.error('Failed to delete role');
  }
}

function getTypeColor(isSystem: boolean) {
  return isSystem ? 'purple' : 'blue';
}

onMounted(() => {
  fetchRoles();
});
</script>

<template>
  <Page auto-content-height>
    <Card>
      <template #title>
        <div class="flex items-center justify-between">
          <span>Role Management</span>
          <Space>
            <Input
              v-model:value="searchText"
              placeholder="Search roles..."
              style="width: 200px"
              allow-clear
              @press-enter="handleSearch"
            >
              <template #prefix>
                <SearchOutlined />
              </template>
            </Input>
            <Button @click="handleSearch">
              <template #icon>
                <SearchOutlined />
              </template>
              Search
            </Button>
            <Button @click="fetchRoles">
              <template #icon>
                <ReloadOutlined />
              </template>
            </Button>
            <Button type="primary" @click="handleCreate">
              <template #icon>
                <PlusOutlined />
              </template>
              Create Role
            </Button>
          </Space>
        </div>
      </template>

      <!-- Statistics Cards -->
      <Row :gutter="[16, 16]" class="mb-6">
        <Col :xs="24" :sm="8">
          <Card size="small">
            <Statistic
              title="Total Roles"
              :value="statistics.totalRoles"
              :value-style="{ color: '#1890ff' }"
            >
              <template #prefix>
                <SafetyCertificateOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="24" :sm="8">
          <Card size="small">
            <Statistic
              title="Active Roles"
              :value="statistics.activeRoles"
              :value-style="{ color: '#52c41a' }"
            >
              <template #prefix>
                <TeamOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="24" :sm="8">
          <Card size="small">
            <Statistic
              title="System Roles"
              :value="statistics.systemRoles"
              :value-style="{ color: '#722ed1' }"
            >
              <template #prefix>
                <SafetyCertificateOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
      </Row>

      <Table
        :columns="columns"
        :data-source="roles"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 900 }"
        row-key="id"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <Tag :color="getTypeColor(record.is_system_role)">
              {{ record.is_system_role ? 'System' : 'Custom' }}
            </Tag>
          </template>

          <template v-if="column.key === 'status'">
            <Tag :color="record.is_active ? 'green' : 'red'">
              {{ record.is_active ? 'Active' : 'Inactive' }}
            </Tag>
          </template>

          <template v-if="column.key === 'actions'">
            <Space>
              <Tooltip title="View Details">
                <Button type="link" size="small" @click="openViewModal(record as any)">
                  <template #icon><EyeOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip title="Edit">
                <Button
                  type="link"
                  size="small"
                  :disabled="record.is_system_role"
                  @click="handleEdit(record as any)"
                >
                  <template #icon><EditOutlined /></template>
                </Button>
              </Tooltip>
              <Popconfirm
                title="Are you sure you want to delete this role?"
                ok-text="Yes"
                cancel-text="No"
                :disabled="record.is_system_role"
                @confirm="handleDelete(record as any)"
              >
                <Tooltip title="Delete">
                  <Button
                    type="link"
                    size="small"
                    danger
                    :disabled="record.is_system_role"
                  >
                    <template #icon><DeleteOutlined /></template>
                  </Button>
                </Tooltip>
              </Popconfirm>
            </Space>
          </template>
        </template>

        <template #emptyText>
          <div class="py-8 text-center">
            <SafetyCertificateOutlined class="mb-2 text-4xl text-gray-400" />
            <p class="text-gray-500">No roles found</p>
          </div>
        </template>
      </Table>
    </Card>

    <!-- View Modal -->
    <Modal
      v-model:open="showModal"
      title="Role Details"
      :width="600"
      :footer="null"
      @cancel="showModal = false"
    >
      <template v-if="selectedRole">
        <div class="mb-6 flex items-center gap-4">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
            <SafetyCertificateOutlined class="text-2xl text-purple-600" />
          </div>
          <div>
            <h2 class="m-0 text-xl font-bold">{{ selectedRole.name }}</h2>
            <p class="text-gray-500">{{ selectedRole.codename }}</p>
          </div>
        </div>

        <Row :gutter="[16, 16]" class="mb-4">
          <Col :span="12">
            <div class="detail-item">
              <span class="detail-label">Type</span>
              <Tag :color="getTypeColor(selectedRole.is_system_role)">
                {{ selectedRole.is_system_role ? 'System Role' : 'Custom Role' }}
              </Tag>
            </div>
          </Col>
          <Col :span="12">
            <div class="detail-item">
              <span class="detail-label">Status</span>
              <Tag :color="selectedRole.is_active ? 'green' : 'red'">
                {{ selectedRole.is_active ? 'Active' : 'Inactive' }}
              </Tag>
            </div>
          </Col>
          <Col :span="24">
            <div class="detail-item">
              <span class="detail-label">Description</span>
              <span class="detail-value">{{ selectedRole.description || 'No description' }}</span>
            </div>
          </Col>
        </Row>

        <div class="mt-4">
          <h3 class="mb-2 font-semibold">Permissions ({{ selectedRole.permissions?.length || 0 }})</h3>
          <div v-if="selectedRole.permissions?.length" class="flex flex-wrap gap-2">
            <Tag
              v-for="perm in selectedRole.permissions"
              :key="perm.id"
              color="blue"
            >
              {{ perm.codename }}
            </Tag>
          </div>
          <p v-else class="text-gray-500">No permissions assigned</p>
        </div>
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
