<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Col,
  DatePicker,
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
  Tooltip,
} from 'ant-design-vue';
import {
  ClockCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';

import {
  getActivityLogsApi,
  type ActivityApi,
} from '#/api/activity';

defineOptions({
  name: 'ActivityLogs',
});

const { RangePicker } = DatePicker;

// Pagination
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total: number) => `Total ${total} activities`,
});

// State
const loading = ref(false);
const showModal = ref(false);
const selectedActivity = ref<ActivityApi.ActivityLog | null>(null);
const activities = ref<ActivityApi.ActivityLog[]>([]);
const searchText = ref('');
const categoryFilter = ref<string | undefined>(undefined);
const levelFilter = ref<string | undefined>(undefined);
const dateRange = ref<any>(null);

const columns = computed(() => [
  {
    title: 'Time',
    key: 'created_at',
    width: 180,
  },
  {
    title: 'User',
    key: 'user',
    width: 150,
  },
  {
    title: 'Action',
    dataIndex: 'action',
    key: 'action',
    width: 120,
  },
  {
    title: 'Entity',
    key: 'entity',
    width: 200,
  },
  {
    title: 'Category',
    key: 'category',
    width: 130,
  },
  {
    title: 'Level',
    key: 'level',
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

const categories = [
  'authentication',
  'authorization',
  'user_management',
  'data_management',
  'system_management',
  'security',
  'workflow',
  'api',
  'file_management',
  'configuration',
];

const levels = ['debug', 'info', 'warning', 'error', 'critical'];

const statistics = computed(() => {
  const total = pagination.value.total;
  const successful = activities.value.filter(a => a.success).length;
  const failed = activities.value.filter(a => !a.success).length;

  return {
    total,
    successful,
    failed,
  };
});

async function fetchActivities() {
  loading.value = true;
  try {
    const params: ActivityApi.ActivityListParams = {
      page: pagination.value.current,
      page_size: pagination.value.pageSize,
    };

    if (categoryFilter.value) {
      params.category = categoryFilter.value;
    }
    if (levelFilter.value) {
      params.level = levelFilter.value;
    }
    if (dateRange.value) {
      params.start_date = dateRange.value[0];
      params.end_date = dateRange.value[1];
    }

    const response = await getActivityLogsApi(params);
    activities.value = response.items || [];
    pagination.value.total = response.total || 0;
  } catch (error) {
    console.error('Failed to fetch activity logs:', error);
    message.error('Failed to load activity logs');
  } finally {
    loading.value = false;
  }
}

function onTableChange(pag: any) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchActivities();
}

function handleSearch() {
  pagination.value.current = 1;
  fetchActivities();
}

function handleFilterChange() {
  pagination.value.current = 1;
  fetchActivities();
}

function openViewModal(record: ActivityApi.ActivityLog) {
  selectedActivity.value = record;
  showModal.value = true;
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    authentication: 'blue',
    authorization: 'purple',
    user_management: 'cyan',
    data_management: 'green',
    system_management: 'orange',
    security: 'red',
    workflow: 'magenta',
    api: 'geekblue',
    file_management: 'lime',
    configuration: 'gold',
  };
  return colors[category?.toLowerCase()] || 'default';
}

function getLevelColor(level: string) {
  const colors: Record<string, string> = {
    debug: 'default',
    info: 'blue',
    warning: 'orange',
    error: 'red',
    critical: 'volcano',
  };
  return colors[level?.toLowerCase()] || 'default';
}

function formatCategory(category: string) {
  if (!category) return '-';
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

onMounted(() => {
  fetchActivities();
});
</script>

<template>
  <Page auto-content-height>
    <Card>
      <template #title>
        <div class="flex items-center justify-between">
          <span>Activity Logs</span>
          <Space wrap>
            <Input
              v-model:value="searchText"
              placeholder="Search..."
              style="width: 150px"
              allow-clear
              @press-enter="handleSearch"
            >
              <template #prefix>
                <SearchOutlined />
              </template>
            </Input>
            <Select
              v-model:value="categoryFilter"
              placeholder="Category"
              style="width: 150px"
              allow-clear
              @change="handleFilterChange"
            >
              <SelectOption
                v-for="cat in categories"
                :key="cat"
                :value="cat"
              >
                {{ formatCategory(cat) }}
              </SelectOption>
            </Select>
            <Select
              v-model:value="levelFilter"
              placeholder="Level"
              style="width: 120px"
              allow-clear
              @change="handleFilterChange"
            >
              <SelectOption
                v-for="lvl in levels"
                :key="lvl"
                :value="lvl"
              >
                {{ lvl.toUpperCase() }}
              </SelectOption>
            </Select>
            <RangePicker
              v-model:value="dateRange"
              style="width: 240px"
              @change="handleFilterChange"
            />
            <Button @click="fetchActivities">
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
              title="Total Activities"
              :value="statistics.total"
              :value-style="{ color: '#1890ff' }"
            >
              <template #prefix>
                <FileTextOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="24" :sm="8">
          <Card size="small">
            <Statistic
              title="Successful"
              :value="statistics.successful"
              :value-style="{ color: '#52c41a' }"
            >
              <template #prefix>
                <ClockCircleOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="24" :sm="8">
          <Card size="small">
            <Statistic
              title="Failed"
              :value="statistics.failed"
              :value-style="{ color: '#ff4d4f' }"
            >
              <template #prefix>
                <ClockCircleOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
      </Row>

      <Table
        :columns="columns"
        :data-source="activities"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1100 }"
        row-key="id"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'created_at'">
            <span class="text-sm">{{ formatDateTime(record.created_at) }}</span>
          </template>

          <template v-if="column.key === 'user'">
            <div class="flex items-center gap-2">
              <UserOutlined />
              <span>{{ record.user?.username || record.user?.email || `User #${record.user_id}` || 'System' }}</span>
            </div>
          </template>

          <template v-if="column.key === 'entity'">
            <Tooltip :title="`${record.entity_type} #${record.entity_id}`">
              <span>{{ record.entity_name || record.entity_type }}</span>
            </Tooltip>
          </template>

          <template v-if="column.key === 'category'">
            <Tag :color="getCategoryColor(record.category)">
              {{ formatCategory(record.category) }}
            </Tag>
          </template>

          <template v-if="column.key === 'level'">
            <Tag :color="getLevelColor(record.level)">
              {{ record.level?.toUpperCase() || 'INFO' }}
            </Tag>
          </template>

          <template v-if="column.key === 'status'">
            <Tag :color="record.success ? 'green' : 'red'">
              {{ record.success ? 'Success' : 'Failed' }}
            </Tag>
          </template>

          <template v-if="column.key === 'actions'">
            <Button type="link" size="small" @click="openViewModal(record as any as ActivityApi.ActivityLog)">
              <template #icon><EyeOutlined /></template>
            </Button>
          </template>
        </template>

        <template #emptyText>
          <div class="py-8 text-center">
            <FileTextOutlined class="mb-2 text-4xl text-gray-400" />
            <p class="text-gray-500">No activity logs found</p>
          </div>
        </template>
      </Table>
    </Card>

    <!-- View Modal -->
    <Modal
      v-model:open="showModal"
      title="Activity Details"
      :width="600"
      :footer="null"
      @cancel="showModal = false"
    >
      <template v-if="selectedActivity">
        <div class="mb-6 flex items-center gap-4">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <FileTextOutlined class="text-2xl text-blue-600" />
          </div>
          <div>
            <h2 class="m-0 text-xl font-bold">{{ selectedActivity.action }}</h2>
            <p class="text-gray-500">{{ selectedActivity.event_id }}</p>
          </div>
        </div>

        <Row :gutter="[16, 16]">
          <Col :span="12">
            <div class="detail-item">
              <span class="detail-label">User</span>
              <span class="detail-value">
                {{ selectedActivity.user?.username || `User #${selectedActivity.user_id}` || 'System' }}
              </span>
            </div>
          </Col>
          <Col :span="12">
            <div class="detail-item">
              <span class="detail-label">Time</span>
              <span class="detail-value">{{ formatDateTime(selectedActivity.created_at) }}</span>
            </div>
          </Col>
          <Col :span="12">
            <div class="detail-item">
              <span class="detail-label">Category</span>
              <Tag :color="getCategoryColor(selectedActivity.category)">
                {{ formatCategory(selectedActivity.category) }}
              </Tag>
            </div>
          </Col>
          <Col :span="12">
            <div class="detail-item">
              <span class="detail-label">Level</span>
              <Tag :color="getLevelColor(selectedActivity.level)">
                {{ selectedActivity.level?.toUpperCase() || 'INFO' }}
              </Tag>
            </div>
          </Col>
          <Col :span="12">
            <div class="detail-item">
              <span class="detail-label">Entity Type</span>
              <span class="detail-value">{{ selectedActivity.entity_type }}</span>
            </div>
          </Col>
          <Col :span="12">
            <div class="detail-item">
              <span class="detail-label">Entity ID</span>
              <span class="detail-value">{{ selectedActivity.entity_id || '-' }}</span>
            </div>
          </Col>
          <Col :span="24">
            <div class="detail-item">
              <span class="detail-label">Description</span>
              <span class="detail-value">{{ selectedActivity.description || 'No description' }}</span>
            </div>
          </Col>
          <Col :span="12">
            <div class="detail-item">
              <span class="detail-label">IP Address</span>
              <span class="detail-value">{{ selectedActivity.ip_address || '-' }}</span>
            </div>
          </Col>
          <Col :span="12">
            <div class="detail-item">
              <span class="detail-label">Status</span>
              <Tag :color="selectedActivity.success ? 'green' : 'red'">
                {{ selectedActivity.success ? 'Success' : 'Failed' }}
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
