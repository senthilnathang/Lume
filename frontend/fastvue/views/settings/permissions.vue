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
  Row,
  Select,
  SelectOption,
  Space,
  Statistic,
  Table,
  Tag,
} from 'ant-design-vue';
import {
  EyeOutlined,
  KeyOutlined,
  ReloadOutlined,
  SearchOutlined,
  UnlockOutlined,
} from '@ant-design/icons-vue';

import {
  getPermissionsApi,
  type SettingsApi,
} from '#/api/settings';

defineOptions({
  name: 'PermissionSettings',
});

// Pagination
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total: number) => `Total ${total} permissions`,
});

// State
const loading = ref(false);
const showModal = ref(false);
const selectedPermission = ref<SettingsApi.Permission | null>(null);
const permissions = ref<SettingsApi.Permission[]>([]);
const searchText = ref('');
const categoryFilter = ref<string | undefined>(undefined);

const columns = computed(() => [
  {
    title: 'Permission Name',
    dataIndex: 'name',
    key: 'name',
    width: 300,
  },
  {
    title: 'Codename',
    dataIndex: 'codename',
    key: 'codename',
    width: 200,
  },
  {
    title: 'Category',
    key: 'category',
    width: 150,
  },
  {
    title: 'Action',
    dataIndex: 'action',
    key: 'action',
    width: 100,
  },
  {
    title: 'Status',
    key: 'status',
    width: 100,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 80,
    fixed: 'right' as const,
  },
]);

const statistics = computed(() => {
  const totalPermissions = pagination.value.total;
  const activePermissions = permissions.value.filter(p => p.is_active).length;
  const categories = new Set(permissions.value.map(p => p.category));

  return {
    totalPermissions,
    activePermissions,
    categoryCount: categories.size,
  };
});

// Unique categories for filtering
const availableCategories = computed(() => {
  const categories = new Set(permissions.value.map(p => p.category));
  return Array.from(categories).sort();
});

async function fetchPermissions() {
  loading.value = true;
  try {
    const response = await getPermissionsApi({
      page: pagination.value.current,
      page_size: pagination.value.pageSize,
      search: searchText.value || undefined,
      category: categoryFilter.value || undefined,
    });
    permissions.value = response.items || [];
    pagination.value.total = response.total || 0;
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
    message.error('Failed to load permissions');
  } finally {
    loading.value = false;
  }
}

function onTableChange(pag: any) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchPermissions();
}

function handleSearch() {
  pagination.value.current = 1;
  fetchPermissions();
}

function handleCategoryFilter(value: any) {
  categoryFilter.value = value;
  pagination.value.current = 1;
  fetchPermissions();
}

function openViewModal(record: SettingsApi.Permission) {
  selectedPermission.value = record;
  showModal.value = true;
}

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    user: 'blue',
    company: 'green',
    system: 'red',
    role: 'purple',
    group: 'orange',
    permission: 'cyan',
  };
  return colors[category?.toLowerCase()] || 'default';
}

function getActionColor(action: string) {
  const colors: Record<string, string> = {
    create: 'green',
    read: 'blue',
    update: 'orange',
    delete: 'red',
    manage: 'purple',
  };
  return colors[action?.toLowerCase()] || 'default';
}

function formatCategory(category: string) {
  if (!category) return '-';
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

onMounted(() => {
  fetchPermissions();
});
</script>

<template>
  <Page auto-content-height>
    <Card>
      <template #title>
        <div class="flex items-center justify-between">
          <span>Permission Management</span>
          <Space>
            <Input
              v-model:value="searchText"
              placeholder="Search permissions..."
              style="width: 200px"
              allow-clear
              @press-enter="handleSearch"
            >
              <template #prefix>
                <SearchOutlined />
              </template>
            </Input>
            <Select
              v-model:value="categoryFilter"
              placeholder="Filter by category"
              style="width: 180px"
              allow-clear
              @change="handleCategoryFilter"
            >
              <SelectOption
                v-for="cat in availableCategories"
                :key="cat"
                :value="cat"
              >
                {{ formatCategory(cat) }}
              </SelectOption>
            </Select>
            <Button @click="handleSearch">
              <template #icon>
                <SearchOutlined />
              </template>
              Search
            </Button>
            <Button @click="fetchPermissions">
              <template #icon>
                <ReloadOutlined />
              </template>
            </Button>
          </Space>
        </div>
      </template>

      <!-- Statistics Cards -->
      <Row :gutter="[16, 16]" class="mb-6">
        <Col :xs="24" :sm="8">
          <Card size="small">
            <Statistic
              title="Total Permissions"
              :value="statistics.totalPermissions"
              :value-style="{ color: '#1890ff' }"
            >
              <template #prefix>
                <KeyOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="24" :sm="8">
          <Card size="small">
            <Statistic
              title="Active Permissions"
              :value="statistics.activePermissions"
              :value-style="{ color: '#52c41a' }"
            >
              <template #prefix>
                <UnlockOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="24" :sm="8">
          <Card size="small">
            <Statistic
              title="Categories"
              :value="statistics.categoryCount"
              :value-style="{ color: '#722ed1' }"
            >
              <template #prefix>
                <UnlockOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
      </Row>

      <Table
        :columns="columns"
        :data-source="permissions"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 900 }"
        row-key="id"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'category'">
            <Tag :color="getCategoryColor(record.category)">
              {{ formatCategory(record.category) }}
            </Tag>
          </template>

          <template v-if="column.key === 'action'">
            <Tag :color="getActionColor(record.action)">
              {{ record.action?.toUpperCase() || '-' }}
            </Tag>
          </template>

          <template v-if="column.key === 'status'">
            <Tag :color="record.is_active ? 'green' : 'red'">
              {{ record.is_active ? 'Active' : 'Inactive' }}
            </Tag>
          </template>

          <template v-if="column.key === 'actions'">
            <Button type="link" size="small" @click="openViewModal(record as any)">
              <template #icon><EyeOutlined /></template>
            </Button>
          </template>
        </template>

        <template #emptyText>
          <div class="py-8 text-center">
            <KeyOutlined class="mb-2 text-4xl text-gray-400" />
            <p class="text-gray-500">No permissions found</p>
          </div>
        </template>
      </Table>
    </Card>

    <!-- View Modal -->
    <Modal
      v-model:open="showModal"
      title="Permission Details"
      :width="500"
      :footer="null"
      @cancel="showModal = false"
    >
      <template v-if="selectedPermission">
        <div class="mb-6 flex items-center gap-4">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <KeyOutlined class="text-2xl text-blue-600" />
          </div>
          <div>
            <h2 class="m-0 text-xl font-bold">{{ selectedPermission.name }}</h2>
            <p class="text-gray-500">{{ selectedPermission.codename }}</p>
          </div>
        </div>

        <Row :gutter="[16, 16]">
          <Col :span="12">
            <div class="detail-item">
              <span class="detail-label">Category</span>
              <Tag :color="getCategoryColor(selectedPermission.category)">
                {{ formatCategory(selectedPermission.category) }}
              </Tag>
            </div>
          </Col>
          <Col :span="12">
            <div class="detail-item">
              <span class="detail-label">Action</span>
              <Tag :color="getActionColor(selectedPermission.action)">
                {{ selectedPermission.action?.toUpperCase() || '-' }}
              </Tag>
            </div>
          </Col>
          <Col :span="12">
            <div class="detail-item">
              <span class="detail-label">Status</span>
              <Tag :color="selectedPermission.is_active ? 'green' : 'red'">
                {{ selectedPermission.is_active ? 'Active' : 'Inactive' }}
              </Tag>
            </div>
          </Col>
          <Col :span="12">
            <div class="detail-item">
              <span class="detail-label">System Permission</span>
              <Tag :color="selectedPermission.is_system_permission ? 'blue' : 'default'">
                {{ selectedPermission.is_system_permission ? 'Yes' : 'No' }}
              </Tag>
            </div>
          </Col>
        </Row>
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
