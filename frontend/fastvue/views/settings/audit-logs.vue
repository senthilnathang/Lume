<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Col,
  // DatePicker,
  Drawer,
  Descriptions,
  Input,
  // Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  // Timeline,
  Tooltip,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  HistoryOutlined,
  LoginOutlined,
  LogoutOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons-vue';

import { EmptyState } from '#/components/common';
import { usePagination } from '#/composables';
import { dateFormat } from '#/utils/formatters';
import {
  getAuditLogsApi,
  getAuditLogDetailApi,
  getAuditStatsApi,
  getAuditContentTypesApi,
  AuditActionLabels,
  type AuditApi,
} from '#/api/audit';
import { getUsersApi } from '#/api/user';

defineOptions({
  name: 'AuditLogs',
});

// Pagination using composable
const { pagination, setTotal, resetPagination, handleTableChange: onTableChange, getParams } = usePagination({ defaultPageSize: 20 });

const loading = ref(false);
const logs = ref<AuditApi.AuditLogEntry[]>([]);
const contentTypes = ref<Array<{ id: number; name: string; model: string }>>([]);
const users = ref<{ id: number; username: string; name: string }[]>([]);
const stats = ref<AuditApi.AuditStats | null>(null);

// Detail drawer
const drawerVisible = ref(false);
const selectedLog = ref<(AuditApi.AuditLogEntry & Record<string, any>) | null>(null);
const loadingDetail = ref(false);

const filters = ref({
  search: '',
  action: null as any,
  content_type_id: null as any,
  user_id: null as any,
  success: null as any,
  date_from: null as string | null,
  date_to: null as string | null,
});

const columns = [
  {
    title: 'Time',
    key: 'timestamp',
    width: 180,
    fixed: 'left' as const,
  },
  {
    title: 'User',
    key: 'user',
    width: 150,
  },
  {
    title: 'Action',
    key: 'action',
    width: 120,
  },
  {
    title: 'Object Type',
    key: 'content_type',
    width: 150,
  },
  {
    title: 'Object',
    key: 'object',
    width: 250,
  },
  {
    title: 'IP Address',
    key: 'ip_address',
    width: 130,
  },
  {
    title: 'Status',
    key: 'success',
    width: 100,
  },
  {
    title: 'Details',
    key: 'message',
  },
  {
    title: '',
    key: 'actions',
    width: 60,
    fixed: 'right' as const,
  },
];

const actionOptions = [
  { value: null, label: 'All Actions' },
  { value: 0, label: 'View' },
  { value: 1, label: 'Create' },
  { value: 2, label: 'Update' },
  { value: 3, label: 'Delete' },
  { value: 4, label: 'Login' },
  { value: 5, label: 'Logout' },
  { value: 6, label: 'Export' },
  { value: 7, label: 'Import' },
];

const successOptions: any[] = [
  { value: null, label: 'All Status' },
  { value: true, label: 'Success' },
  { value: false, label: 'Failed' },
];

const contentTypeOptions = computed(() => {
  return [
    { value: null, label: 'All Types' },
    ...contentTypes.value.map((ct: any) => ({
      value: ct.id,
      label: ct.name,
    })),
  ];
});

const userOptions = computed(() => {
  return [
    { value: null, label: 'All Users' },
    ...users.value.map((u) => ({
      value: u.id,
      label: u.name || u.username,
    })),
  ];
});

async function fetchLogs() {
  loading.value = true;
  try {
    const params = getParams();
    const response = await getAuditLogsApi({
      page: params.page,
      page_size: params.page_size,
      search: filters.value.search || undefined,
      action: (filters.value.action ?? undefined) as any,
      entity_type: filters.value.content_type_id != null ? String(filters.value.content_type_id) : undefined,
      user_id: filters.value.user_id ?? undefined,
      success: filters.value.success ?? undefined,
      date_from: filters.value.date_from || undefined,
      date_to: filters.value.date_to || undefined,
    } as any);
    logs.value = (response as any).results || (response as any).items || [];
    setTotal((response as any).count || (response as any).total || 0);
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchStats() {
  try {
    stats.value = await getAuditStatsApi({ days: 30 });
  } catch (error) {
    console.error('Failed to fetch audit stats:', error);
  }
}

async function fetchContentTypes() {
  try {
    contentTypes.value = await getAuditContentTypesApi();
  } catch (error) {
    console.error('Failed to fetch content types:', error);
  }
}

async function fetchUsers() {
  try {
    const response = await getUsersApi({ page_size: 100 });
    users.value = ((response as any).results || []).map((u: any) => ({
      id: u.id,
      username: u.username,
      name: `${u.first_name} ${u.last_name}`.trim() || u.username,
    }));
  } catch (error) {
    console.error('Failed to fetch users:', error);
  }
}

async function openLogDetail(record: AuditApi.AuditLogEntry) {
  loadingDetail.value = true;
  drawerVisible.value = true;
  try {
    selectedLog.value = await getAuditLogDetailApi(record.id);
  } catch (error) {
    console.error('Failed to fetch log detail:', error);
    selectedLog.value = record;
  } finally {
    loadingDetail.value = false;
  }
}

function handleTableChange(pag: any) {
  onTableChange(pag);
  fetchLogs();
}

function handleSearch() {
  resetPagination();
  fetchLogs();
}

function handleFilterChange() {
  resetPagination();
  fetchLogs();
}

function resetFilters() {
  filters.value = {
    search: '',
    action: null,
    content_type_id: null,
    user_id: null,
    success: null,
    date_from: null,
    date_to: null,
  };
  resetPagination();
  fetchLogs();
}

function formatTime(timeStr: string) {
  return dateFormat.datetime(timeStr, 'YYYY-MM-DD HH:mm:ss');
}

function formatRelativeTime(timeStr: string) {
  return dateFormat.relative(timeStr);
}

function getActionIcon(action: string | number) {
  switch (action) {
    case 0:
      return EyeOutlined;
    case 1:
      return PlusOutlined;
    case 2:
      return EditOutlined;
    case 3:
      return DeleteOutlined;
    case 4:
      return LoginOutlined;
    case 5:
      return LogoutOutlined;
    case 6:
    case 7:
      return DownloadOutlined;
    default:
      return FileTextOutlined;
  }
}

function getActionColor(action: string | number) {
  switch (action) {
    case 0:
      return 'default';
    case 1:
      return 'green';
    case 2:
      return 'blue';
    case 3:
      return 'red';
    case 4:
      return 'cyan';
    case 5:
      return 'orange';
    case 6:
    case 7:
      return 'purple';
    default:
      return 'default';
  }
}

function formatChanges(changes: Record<string, { old: any; new: any }> | null) {
  if (!changes || Object.keys(changes).length === 0) return [];
  return Object.entries(changes).map(([field, value]) => ({
    field: field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    old: value.old,
    new: value.new,
  }));
}

onMounted(() => {
  fetchLogs();
  fetchStats();
  fetchContentTypes();
  fetchUsers();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <h1 class="mb-6 text-2xl font-bold">
        <HistoryOutlined class="mr-2" />
        Audit Logs
      </h1>

      <!-- Statistics Cards -->
      <Row :gutter="[16, 16]" class="mb-6">
        <Col :xs="12" :sm="6" :md="4">
          <Card>
            <Statistic
              title="Total Entries"
              :value="stats?.total_count || 0"
              :value-style="{ color: '#1890ff' }"
            >
              <template #prefix>
                <HistoryOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6" :md="4">
          <Card>
            <Statistic
              title="Creates"
              :value="(stats as any)?.create_count || 0"
              :value-style="{ color: '#52c41a' }"
            >
              <template #prefix>
                <PlusOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6" :md="4">
          <Card>
            <Statistic
              title="Updates"
              :value="(stats as any)?.update_count || 0"
              :value-style="{ color: '#1890ff' }"
            >
              <template #prefix>
                <EditOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6" :md="4">
          <Card>
            <Statistic
              title="Deletes"
              :value="(stats as any)?.delete_count || 0"
              :value-style="{ color: '#f5222d' }"
            >
              <template #prefix>
                <DeleteOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6" :md="4">
          <Card>
            <Statistic
              title="Logins"
              :value="(stats as any)?.login_count || 0"
              :value-style="{ color: '#722ed1' }"
            >
              <template #prefix>
                <LoginOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6" :md="4">
          <Card>
            <Statistic
              title="Failed"
              :value="stats?.failure_count || 0"
              :value-style="{ color: '#faad14' }"
            >
              <template #prefix>
                <WarningOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
      </Row>

      <!-- Filters -->
      <Card class="mb-4">
        <Row :gutter="[16, 16]" align="middle">
          <Col :xs="24" :sm="12" :md="6">
            <Input.Search
              v-model:value="filters.search"
              placeholder="Search logs..."
              @search="handleSearch"
            >
              <template #prefix>
                <SearchOutlined />
              </template>
            </Input.Search>
          </Col>
          <Col :xs="12" :sm="6" :md="3">
            <Select
              v-model:value="filters.action"
              :options="actionOptions"
              placeholder="Action"
              style="width: 100%"
              @change="handleFilterChange"
            />
          </Col>
          <Col :xs="12" :sm="6" :md="4">
            <Select
              v-model:value="filters.content_type_id"
              :options="contentTypeOptions"
              placeholder="Object Type"
              style="width: 100%"
              show-search
              :filter-option="(input: string, option: any) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              "
              @change="handleFilterChange"
            />
          </Col>
          <Col :xs="12" :sm="6" :md="4">
            <Select
              v-model:value="filters.user_id"
              :options="userOptions"
              placeholder="User"
              style="width: 100%"
              show-search
              :filter-option="(input: string, option: any) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              "
              @change="handleFilterChange"
            />
          </Col>
          <Col :xs="12" :sm="6" :md="3">
            <Select
              v-model:value="filters.success"
              :options="successOptions"
              placeholder="Status"
              style="width: 100%"
              @change="handleFilterChange"
            />
          </Col>
          <Col :xs="12" :sm="6" :md="4">
            <Space>
              <Button @click="resetFilters">Reset</Button>
              <Button type="primary" @click="() => { fetchLogs(); fetchStats(); }">
                <template #icon>
                  <ReloadOutlined />
                </template>
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <!-- Audit Log Table -->
      <Card>
        <Table
          :columns="columns"
          :data-source="logs"
          :loading="loading"
          :pagination="pagination"
          :scroll="{ x: 1400 }"
          row-key="id"
          size="small"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'timestamp'">
              <Tooltip :title="formatTime(record.timestamp)">
                <span class="text-gray-600">
                  {{ formatRelativeTime(record.timestamp) }}
                </span>
              </Tooltip>
            </template>

            <template v-if="column.key === 'user'">
              <div class="flex items-center gap-2">
                <UserOutlined class="text-gray-400" />
                <span>{{ record.user_name || 'System' }}</span>
              </div>
            </template>

            <template v-if="column.key === 'action'">
              <Tag :color="getActionColor(record.action)">
                <component :is="getActionIcon(record.action)" class="mr-1" />
                {{ record.action_label || (AuditActionLabels as any)[record.action] }}
              </Tag>
            </template>

            <template v-if="column.key === 'content_type'">
              <Tag v-if="record.content_type_name" color="purple">
                {{ record.content_type_name }}
              </Tag>
              <span v-else class="text-gray-400">-</span>
            </template>

            <template v-if="column.key === 'object'">
              <Tooltip :title="record.object_repr">
                <span class="block max-w-60 truncate">
                  {{ record.object_repr || '-' }}
                </span>
              </Tooltip>
            </template>

            <template v-if="column.key === 'ip_address'">
              <span class="font-mono text-xs text-gray-500">
                {{ record.ip_address || '-' }}
              </span>
            </template>

            <template v-if="column.key === 'success'">
              <Tag v-if="record.success" color="green">
                <CheckCircleOutlined class="mr-1" />
                Success
              </Tag>
              <Tag v-else color="red">
                <CloseCircleOutlined class="mr-1" />
                Failed
              </Tag>
            </template>

            <template v-if="column.key === 'message'">
              <Tooltip :title="record.message">
                <span class="block max-w-72 truncate text-gray-500">
                  {{ record.message || '-' }}
                </span>
              </Tooltip>
            </template>

            <template v-if="column.key === 'actions'">
              <Tooltip title="View Details">
                <Button type="link" size="small" @click="openLogDetail(record as any as AuditApi.AuditLogEntry)">
                  <template #icon><EyeOutlined /></template>
                </Button>
              </Tooltip>
            </template>
          </template>

          <template #emptyText>
            <EmptyState
              title="No audit log entries found"
              description="Activity logs will appear here when actions are performed"
            >
              <template #icon>
                <HistoryOutlined />
              </template>
            </EmptyState>
          </template>
        </Table>
      </Card>

      <!-- Detail Drawer -->
      <Drawer
        v-model:open="drawerVisible"
        title="Audit Log Details"
        :width="600"
        placement="right"
      >
        <template v-if="selectedLog">
          <Descriptions bordered :column="1" size="small" class="mb-6">
            <Descriptions.Item label="Timestamp">
              {{ formatTime(selectedLog.timestamp) }}
            </Descriptions.Item>
            <Descriptions.Item label="User">
              <div class="flex items-center gap-2">
                <UserOutlined />
                {{ selectedLog.user_name || 'System' }}
                <span v-if="selectedLog.user_email" class="text-gray-400">
                  ({{ selectedLog.user_email }})
                </span>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Action">
              <Tag :color="getActionColor(selectedLog.action)">
                <component :is="getActionIcon(selectedLog.action)" class="mr-1" />
                {{ selectedLog.action_label || AuditActionLabels[selectedLog.action] }}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag v-if="selectedLog.success" color="green">
                <CheckCircleOutlined class="mr-1" />
                Success
              </Tag>
              <Tag v-else color="red">
                <CloseCircleOutlined class="mr-1" />
                Failed
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Object Type">
              {{ selectedLog.content_type_name || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="Object">
              {{ selectedLog.object_repr || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="Message">
              {{ selectedLog.message || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="IP Address">
              <span class="font-mono">{{ selectedLog.ip_address || '-' }}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Request">
              <span class="font-mono text-sm">
                {{ selectedLog.request_method }} {{ selectedLog.request_path }}
              </span>
            </Descriptions.Item>
            <Descriptions.Item v-if="!selectedLog.success && selectedLog.error_message" label="Error">
              <span class="text-red-500">{{ selectedLog.error_message }}</span>
            </Descriptions.Item>
          </Descriptions>

          <!-- Changes Section -->
          <div v-if="selectedLog.changes && Object.keys(selectedLog.changes).length > 0" class="mb-6">
            <h4 class="mb-3 font-semibold">Changes</h4>
            <div class="rounded border">
              <div
                v-for="change in formatChanges(selectedLog.changes)"
                :key="change.field"
                class="border-b p-3 last:border-b-0"
              >
                <div class="mb-1 font-medium">{{ change.field }}</div>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span class="text-gray-400">Old: </span>
                    <span class="text-red-500">{{ change.old || '(empty)' }}</span>
                  </div>
                  <div>
                    <span class="text-gray-400">New: </span>
                    <span class="text-green-500">{{ change.new || '(empty)' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- User Agent -->
          <div v-if="selectedLog.user_agent" class="text-xs text-gray-400">
            <strong>User Agent:</strong> {{ selectedLog.user_agent }}
          </div>
        </template>
      </Drawer>
    </div>
  </Page>
</template>
