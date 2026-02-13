<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Input,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';

import { requestClient } from '#/api/request';

defineOptions({
  name: 'RECRUITMENTPipelineList',
});

const router = useRouter();

// Pagination state
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total: number) => `Total ${total} items`,
});

// State
const loading = ref(false);
const items = ref<any[]>([]);
const searchText = ref('');

// Table columns - customize based on your model fields
const columns = computed(() => [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Created', dataIndex: 'created_at', key: 'created_at', width: 150 },
  { title: 'Actions', key: 'actions', width: 150, fixed: 'right' as const },
]);

// Fetch data
async function fetchData() {
  loading.value = true;
  try {
    const params = {
      skip: (pagination.value.current - 1) * pagination.value.pageSize,
      limit: pagination.value.pageSize,
      search: searchText.value || undefined,
    };
    const response = await requestClient.get<any>('/recruitment/pipeline/', { params });
    items.value = response.items || [];
    pagination.value.total = response.total || 0;
  } catch (error) {
    console.error('Failed to fetch data:', error);
    message.error('Failed to load data');
  } finally {
    loading.value = false;
  }
}

function onTableChange(pag: any) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchData();
}

function handleSearch() {
  pagination.value.current = 1;
  fetchData();
}

function handleCreate() {
  router.push({ name: 'RECRUITMENTPipelineCreate' });
}

function handleEdit(record: any) {
  router.push({ name: 'RECRUITMENTPipelineEdit', params: { id: record.id } });
}

function handleView(record: any) {
  router.push({ name: 'RECRUITMENTPipelineView', params: { id: record.id } });
}

async function handleDelete(record: any) {
  try {
    await requestClient.delete(`/recruitment/pipeline/${record.id}`);
    message.success('Deleted successfully');
    fetchData();
  } catch (error) {
    console.error('Failed to delete:', error);
    message.error('Failed to delete');
  }
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <Page
    title="Pipeline"
    description="Manage pipeline records"
  >
    <Card>
      <!-- Toolbar -->
      <div class="mb-4 flex items-center justify-between">
        <Space>
          <Input
            v-model:value="searchText"
            placeholder="Search..."
            style="width: 250px"
            allow-clear
            @press-enter="handleSearch"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </Input>
          <Button @click="handleSearch">Search</Button>
        </Space>
        <Space>
          <Button @click="fetchData">
            <template #icon><ReloadOutlined /></template>
            Refresh
          </Button>
          <Button type="primary" @click="handleCreate">
            <template #icon><PlusOutlined /></template>
            Create
          </Button>
        </Space>
      </div>

      <!-- Table -->
      <Table
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="middle"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Tag :color="record.is_active !== false ? 'green' : 'red'">
              {{ record.is_active !== false ? 'Active' : 'Inactive' }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'created_at'">
            {{ record.created_at ? new Date(record.created_at).toLocaleDateString() : '-' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <Space>
              <Button type="link" size="small" @click="handleView(record)">
                <template #icon><EyeOutlined /></template>
              </Button>
              <Button type="link" size="small" @click="handleEdit(record)">
                <template #icon><EditOutlined /></template>
              </Button>
              <Popconfirm
                title="Are you sure you want to delete this item?"
                ok-text="Yes"
                cancel-text="No"
                @confirm="handleDelete(record)"
              >
                <Button type="link" size="small" danger>
                  <template #icon><DeleteOutlined /></template>
                </Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>
  </Page>
</template>
