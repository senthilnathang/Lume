<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Col,
  Input,
  message,
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
  TeamOutlined,
  UnlockOutlined,
} from '@ant-design/icons-vue';

import {
  deleteGroupApi,
  getGroupsApi,
  type SettingsApi,
} from '#/api/settings';

defineOptions({
  name: 'GroupSettings',
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
  showTotal: (total: number) => `Total ${total} groups`,
});

// State
const loading = ref(false);
const groups = ref<SettingsApi.Group[]>([]);
const searchText = ref('');

const columns = [
  { title: 'Group Name', dataIndex: 'name', key: 'name', width: 200 },
  { title: 'Codename', dataIndex: 'codename', key: 'codename', width: 150 },
  { title: 'Description', dataIndex: 'description', key: 'description' },
  { title: 'Users', key: 'user_count', width: 100 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Actions', key: 'actions', width: 150, fixed: 'right' as const },
];

const statistics = computed(() => {
  const totalGroups = pagination.value.total;
  const totalUsers = groups.value.reduce((sum, g) => sum + (g.member_count || 0), 0);
  const activeGroups = groups.value.filter(g => g.is_active).length;

  return { totalGroups, totalUsers, activeGroups };
});

async function fetchGroups() {
  loading.value = true;
  try {
    const response = await getGroupsApi({
      page: pagination.value.current,
      page_size: pagination.value.pageSize,
      search: searchText.value || undefined,
    });
    groups.value = response.items || [];
    pagination.value.total = response.total || 0;
  } catch (error) {
    console.error('Failed to fetch groups:', error);
    message.error('Failed to load groups');
  } finally {
    loading.value = false;
  }
}

function onTableChange(pag: any) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchGroups();
}

function handleSearch() {
  pagination.value.current = 1;
  fetchGroups();
}

function navigateToCreate() {
  router.push({ name: 'GroupCreate' });
}

function navigateToEdit(record: SettingsApi.Group) {
  router.push({ name: 'GroupEdit', params: { id: record.id } });
}

function navigateToView(record: SettingsApi.Group) {
  router.push({ name: 'GroupEdit', params: { id: record.id } });
}

async function handleDelete(record: SettingsApi.Group) {
  try {
    await deleteGroupApi(record.id);
    message.success('Group deleted successfully');
    fetchGroups();
  } catch (error: any) {
    console.error('Failed to delete group:', error);
    message.error(error?.response?.data?.error || 'Failed to delete group');
  }
}

onMounted(() => {
  fetchGroups();
});
</script>

<template>
  <Page auto-content-height>
    <Card>
      <template #title>
        <div class="flex items-center justify-between">
          <span>Group Management</span>
          <Space>
            <Input
              v-model:value="searchText"
              placeholder="Search groups..."
              style="width: 250px"
              allow-clear
              @press-enter="handleSearch"
            >
              <template #prefix>
                <TeamOutlined />
              </template>
            </Input>
            <Button @click="handleSearch">Search</Button>
            <Button @click="fetchGroups">Refresh</Button>
            <Button type="primary" @click="navigateToCreate">
              <template #icon><PlusOutlined /></template>
              Add Group
            </Button>
          </Space>
        </div>
      </template>

      <!-- Statistics Cards -->
      <Row :gutter="[16, 16]" class="mb-6">
        <Col :xs="24" :sm="8">
          <Card size="small">
            <Statistic title="Total Groups" :value="statistics.totalGroups" :value-style="{ color: '#1890ff' }">
              <template #prefix><TeamOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="24" :sm="8">
          <Card size="small">
            <Statistic title="Total Members" :value="statistics.totalUsers" :value-style="{ color: '#52c41a' }">
              <template #prefix><TeamOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="24" :sm="8">
          <Card size="small">
            <Statistic title="Active Groups" :value="statistics.activeGroups" :value-style="{ color: '#722ed1' }">
              <template #prefix><UnlockOutlined /></template>
            </Statistic>
          </Card>
        </Col>
      </Row>

      <Table
        :columns="columns"
        :data-source="groups"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 900 }"
        row-key="id"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'user_count'">
            <Tag color="blue">{{ record.member_count || 0 }} members</Tag>
          </template>

          <template v-if="column.key === 'status'">
            <Tag :color="record.is_active ? 'green' : 'red'">
              {{ record.is_active ? 'Active' : 'Inactive' }}
            </Tag>
          </template>

          <template v-if="column.key === 'actions'">
            <Space>
              <Tooltip title="View">
                <Button type="link" size="small" @click="navigateToView(record as any as SettingsApi.Group)">
                  <template #icon><EyeOutlined /></template>
                </Button>
              </Tooltip>
              <Tooltip title="Edit">
                <Button type="link" size="small" @click="navigateToEdit(record as any as SettingsApi.Group)">
                  <template #icon><EditOutlined /></template>
                </Button>
              </Tooltip>
              <Popconfirm
                title="Are you sure you want to delete this group?"
                ok-text="Yes"
                cancel-text="No"
                @confirm="handleDelete(record as any as SettingsApi.Group)"
              >
                <Tooltip title="Delete">
                  <Button type="link" size="small" danger>
                    <template #icon><DeleteOutlined /></template>
                  </Button>
                </Tooltip>
              </Popconfirm>
            </Space>
          </template>
        </template>

        <template #emptyText>
          <div class="py-8 text-center">
            <TeamOutlined class="mb-2 text-4xl text-gray-400" />
            <p class="text-gray-500">No groups found</p>
            <Button type="primary" class="mt-4" @click="navigateToCreate">
              Add First Group
            </Button>
          </div>
        </template>
      </Table>
    </Card>
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
