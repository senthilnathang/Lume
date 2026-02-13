<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  Button,
  Input,
  message,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';

import {
  deleteMenuPermissionApi,
  getAllMenuPermissionsApi,
  type MenuPermissionListItem,
} from '#/api/core/rbac';

defineOptions({
  name: 'MenuPermissionListTab',
});

const router = useRouter();

// State
const data = ref<MenuPermissionListItem[]>([]);
const total = ref(0);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);
const search = ref('');
const typeFilter = ref<string | undefined>(undefined);

// Table columns
const columns = [
  {
    title: 'Menu',
    dataIndex: 'menu_name',
    key: 'menu_name',
    width: 200,
  },
  {
    title: 'Type',
    dataIndex: 'permission_type',
    key: 'permission_type',
    width: 90,
  },
  {
    title: 'Name',
    key: 'entity_name',
    width: 200,
  },
  {
    title: 'View',
    dataIndex: 'can_view',
    key: 'can_view',
    width: 70,
    align: 'center' as const,
  },
  {
    title: 'Edit',
    dataIndex: 'can_edit',
    key: 'can_edit',
    width: 70,
    align: 'center' as const,
  },
  {
    title: 'Create',
    dataIndex: 'can_create',
    key: 'can_create',
    width: 70,
    align: 'center' as const,
  },
  {
    title: 'Delete',
    dataIndex: 'can_delete',
    key: 'can_delete',
    width: 70,
    align: 'center' as const,
  },
  {
    title: 'Priority',
    dataIndex: 'priority',
    key: 'priority',
    width: 80,
    align: 'center' as const,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 100,
    align: 'center' as const,
  },
];

const typeOptions = [
  { value: undefined, label: 'All Types' },
  { value: 'role', label: 'Role' },
  { value: 'group', label: 'Group' },
  { value: 'user', label: 'User' },
];

const typeColorMap: Record<string, string> = {
  role: 'blue',
  group: 'green',
  user: 'orange',
};

async function fetchData() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: page.value,
      page_size: pageSize.value,
    };
    if (search.value) params.search = search.value;
    if (typeFilter.value) params.type = typeFilter.value;

    const res = await getAllMenuPermissionsApi(params);
    data.value = res.items;
    total.value = res.total;
  } catch {
    message.error('Failed to load permissions');
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pagination: any) {
  page.value = pagination.current;
  pageSize.value = pagination.pageSize;
  fetchData();
}

function handleSearch() {
  page.value = 1;
  fetchData();
}

function handleTypeChange() {
  page.value = 1;
  fetchData();
}

function goToCreate() {
  router.push({ name: 'MenuAccessCreate' });
}

function goToEdit(record: MenuPermissionListItem) {
  router.push({
    name: 'MenuAccessEdit',
    params: { id: record.id },
    query: { type: record.permission_type },
  });
}

async function handleDelete(record: MenuPermissionListItem) {
  try {
    await deleteMenuPermissionApi(
      record.menu_item_id,
      record.permission_type,
      record.entity_id,
    );
    message.success('Permission deleted');
    fetchData();
  } catch {
    message.error('Failed to delete permission');
  }
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div>
    <!-- Toolbar -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <Input
        v-model:value="search"
        placeholder="Search menu or entity name..."
        style="width: 280px"
        allow-clear
        @press-enter="handleSearch"
      >
        <template #prefix><SearchOutlined /></template>
      </Input>
      <Select
        v-model:value="typeFilter"
        :options="typeOptions"
        style="width: 150px"
        placeholder="Filter by type"
        @change="handleTypeChange"
      />
      <Button type="primary" @click="goToCreate">
        <template #icon><PlusOutlined /></template>
        Add Permission
      </Button>
    </div>

    <!-- Table -->
    <Table
      :columns="columns"
      :data-source="data"
      :loading="loading"
      :pagination="{
        current: page,
        pageSize: pageSize,
        total: total,
        showSizeChanger: true,
        showTotal: (t: number) => `Total ${t} records`,
      }"
      row-key="id"
      size="middle"
      :scroll="{ x: 900 }"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'menu_name'">
          <div>
            <div class="font-medium">{{ record.menu_name }}</div>
            <div class="text-xs text-gray-400">{{ record.menu_code }}</div>
          </div>
        </template>
        <template v-else-if="column.key === 'permission_type'">
          <Tag :color="typeColorMap[record.permission_type]">
            {{ record.permission_type.charAt(0).toUpperCase() + record.permission_type.slice(1) }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'entity_name'">
          <div>
            <div>{{ record.entity_name }}</div>
            <div class="text-xs text-gray-400">{{ record.entity_codename }}</div>
          </div>
        </template>
        <template v-else-if="column.key === 'can_view'">
          <CheckCircleFilled v-if="record.can_view" class="text-green-500" />
          <CloseCircleFilled v-else class="text-gray-300" />
        </template>
        <template v-else-if="column.key === 'can_edit'">
          <CheckCircleFilled v-if="record.can_edit" class="text-green-500" />
          <CloseCircleFilled v-else class="text-gray-300" />
        </template>
        <template v-else-if="column.key === 'can_create'">
          <CheckCircleFilled v-if="record.can_create" class="text-green-500" />
          <CloseCircleFilled v-else class="text-gray-300" />
        </template>
        <template v-else-if="column.key === 'can_delete'">
          <CheckCircleFilled v-if="record.can_delete" class="text-green-500" />
          <CloseCircleFilled v-else class="text-gray-300" />
        </template>
        <template v-else-if="column.key === 'actions'">
          <Space>
            <Button size="small" type="link" @click="goToEdit(record as any)">
              <template #icon><EditOutlined /></template>
            </Button>
            <Popconfirm
              title="Delete this permission?"
              ok-text="Yes"
              cancel-text="No"
              @confirm="handleDelete(record as any)"
            >
              <Button size="small" type="link" danger>
                <template #icon><DeleteOutlined /></template>
              </Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>
  </div>
</template>
