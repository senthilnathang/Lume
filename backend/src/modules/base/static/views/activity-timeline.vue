<script setup>
import { computed, onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Empty,
  Input,
  List,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  TimelineItem,
  TypographyText,
  TabPane,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileAddOutlined,
  FilterOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  SecurityScanOutlined,
  SettingOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons-vue';

import { requestClient } from '#/api/request';

// State
const loading = ref(false);
const activities = ref([]);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

// Filters
const filterAction = ref(null);
const filterCategory = ref(null);
const filterLevel = ref(null);
const filterEntityType = ref(null);
const filterUserId = ref(null);
const filterSearch = ref('');

// Statistics
const stats = ref({
  total: 0,
  today: 0,
  creates: 0,
  updates: 0,
  deletes: 0,
  errors: 0,
});

// Detail modal
const detailModalVisible = ref(false);
const selectedActivity = ref(null);

// Available options
const actionOptions = [
  { value: 'create', label: 'Created' },
  { value: 'update', label: 'Updated' },
  { value: 'delete', label: 'Deleted' },
  { value: 'view', label: 'Viewed' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'password_change', label: 'Password Change' },
];

const categoryOptions = [
  { value: 'authentication', label: 'Authentication' },
  { value: 'data', label: 'Data Changes' },
  { value: 'system', label: 'System' },
  { value: 'security', label: 'Security' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'notification', label: 'Notification' },
  { value: 'api', label: 'API' },
];

const levelOptions = [
  { value: 'debug', label: 'Debug' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'critical', label: 'Critical' },
];

// Action icons and colors
const ACTION_CONFIG = {
  create: { icon: FileAddOutlined, color: 'green' },
  update: { icon: EditOutlined, color: 'blue' },
  delete: { icon: DeleteOutlined, color: 'red' },
  view: { icon: EyeOutlined, color: 'default' },
  login: { icon: UserOutlined, color: 'cyan' },
  logout: { icon: UserOutlined, color: 'orange' },
  password_change: { icon: SecurityScanOutlined, color: 'purple' },
  default: { icon: HistoryOutlined, color: 'default' },
};

// Computed
const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: totalCount.value,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total) => `Total ${total} activities`,
}));

// Columns for table view
const columns = [
  {
    title: 'Time',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 160,
    customRender: ({ text }) => formatTimestamp(text),
  },
  {
    title: 'User',
    key: 'user',
    width: 180,
  },
  {
    title: 'Action',
    dataIndex: 'action',
    key: 'action',
    width: 100,
  },
  {
    title: 'Entity',
    key: 'entity',
    width: 200,
  },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
  },
  {
    title: 'Status',
    key: 'status',
    width: 100,
    align: 'center',
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 80,
    align: 'center',
  },
];

// Methods
async function fetchActivities() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.append('page', currentPage.value.toString());
    params.append('page_size', pageSize.value.toString());

    if (filterAction.value) params.append('action', filterAction.value);
    if (filterCategory.value) params.append('category', filterCategory.value);
    if (filterLevel.value) params.append('level', filterLevel.value);
    if (filterEntityType.value) params.append('entity_type', filterEntityType.value);
    if (filterUserId.value) params.append('user_id', filterUserId.value);

    const res = await requestClient.get(`/activity-logs/?${params.toString()}`);
    activities.value = res.items || [];
    totalCount.value = res.total || 0;

    // Calculate stats
    calculateStats(res.items || []);
  } catch (err) {
    console.error('Failed to fetch activities:', err);
    activities.value = [];
  } finally {
    loading.value = false;
  }
}

function calculateStats(items) {
  const today = new Date().toDateString();

  stats.value = {
    total: totalCount.value,
    today: items.filter(a => new Date(a.created_at).toDateString() === today).length,
    creates: items.filter(a => a.action === 'create').length,
    updates: items.filter(a => a.action === 'update').length,
    deletes: items.filter(a => a.action === 'delete').length,
    errors: items.filter(a => !a.success).length,
  };
}

function formatTimestamp(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getActionConfig(action) {
  return ACTION_CONFIG[action] || ACTION_CONFIG.default;
}

function handleTableChange(pag) {
  currentPage.value = pag.current;
  pageSize.value = pag.pageSize;
  fetchActivities();
}

function showActivityDetail(activity) {
  selectedActivity.value = activity;
  detailModalVisible.value = true;
}

function clearFilters() {
  filterAction.value = null;
  filterCategory.value = null;
  filterLevel.value = null;
  filterEntityType.value = null;
  filterUserId.value = null;
  filterSearch.value = '';
  currentPage.value = 1;
  fetchActivities();
}

function refresh() {
  fetchActivities();
}

// Watch filters
watch([filterAction, filterCategory, filterLevel], () => {
  currentPage.value = 1;
  fetchActivities();
});

// Init
onMounted(() => {
  fetchActivities();
});
</script>

<template>
  <Page title="Activity Timeline" description="View and track all system activities">
    <!-- Statistics Cards -->
    <Row :gutter="16" style="margin-bottom: 24px;">
      <Col :span="4">
        <Card size="small">
          <Statistic title="Total Activities" :value="stats.total">
            <template #prefix><HistoryOutlined /></template>
          </Statistic>
        </Card>
      </Col>
      <Col :span="4">
        <Card size="small">
          <Statistic title="Today" :value="stats.today" :value-style="{ color: '#1890ff' }">
            <template #prefix><ClockCircleOutlined /></template>
          </Statistic>
        </Card>
      </Col>
      <Col :span="4">
        <Card size="small">
          <Statistic title="Creates" :value="stats.creates" :value-style="{ color: '#52c41a' }">
            <template #prefix><FileAddOutlined /></template>
          </Statistic>
        </Card>
      </Col>
      <Col :span="4">
        <Card size="small">
          <Statistic title="Updates" :value="stats.updates" :value-style="{ color: '#1890ff' }">
            <template #prefix><EditOutlined /></template>
          </Statistic>
        </Card>
      </Col>
      <Col :span="4">
        <Card size="small">
          <Statistic title="Deletes" :value="stats.deletes" :value-style="{ color: '#ff4d4f' }">
            <template #prefix><DeleteOutlined /></template>
          </Statistic>
        </Card>
      </Col>
      <Col :span="4">
        <Card size="small">
          <Statistic title="Errors" :value="stats.errors" :value-style="{ color: '#ff4d4f' }">
            <template #prefix><WarningOutlined /></template>
          </Statistic>
        </Card>
      </Col>
    </Row>

    <Card>
      <!-- Filters -->
      <div style="margin-bottom: 16px;">
        <Space wrap>
          <Select
            v-model:value="filterAction"
            placeholder="Filter by action"
            allowClear
            style="width: 150px;"
            :options="actionOptions"
          />
          <Select
            v-model:value="filterCategory"
            placeholder="Filter by category"
            allowClear
            style="width: 160px;"
            :options="categoryOptions"
          />
          <Select
            v-model:value="filterLevel"
            placeholder="Filter by level"
            allowClear
            style="width: 140px;"
            :options="levelOptions"
          />
          <Input
            v-model:value="filterEntityType"
            placeholder="Entity type (e.g., user)"
            allowClear
            style="width: 180px;"
            @pressEnter="fetchActivities"
          />
          <Button @click="fetchActivities">
            <template #icon><SearchOutlined /></template>
            Search
          </Button>
          <Button @click="clearFilters" type="link">Clear Filters</Button>
          <Button @click="refresh">
            <template #icon><ReloadOutlined /></template>
          </Button>
        </Space>
      </div>

      <Spin :spinning="loading">
        <Tabs>
          <!-- Table View -->
          <TabPane key="table" tab="Table View">
            <Table
              :columns="columns"
              :dataSource="activities"
              :pagination="pagination"
              @change="handleTableChange"
              rowKey="id"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'user'">
                  <Space v-if="record.user">
                    <Avatar :size="24" :src="record.user.avatar_url">
                      <template #icon><UserOutlined /></template>
                    </Avatar>
                    <span>{{ record.user.full_name || 'Unknown' }}</span>
                  </Space>
                  <span v-else style="color: #999;">System</span>
                </template>

                <template v-else-if="column.key === 'action'">
                  <Tag :color="getActionConfig(record.action).color">
                    {{ record.action }}
                  </Tag>
                </template>

                <template v-else-if="column.key === 'entity'">
                  <Space>
                    <Tag>{{ record.entity_type }}</Tag>
                    <span v-if="record.entity_name">{{ record.entity_name }}</span>
                    <span v-else-if="record.entity_id" style="color: #999;">
                      #{{ record.entity_id }}
                    </span>
                  </Space>
                </template>

                <template v-else-if="column.key === 'status'">
                  <Tag v-if="record.success" color="success">
                    <CheckCircleOutlined /> OK
                  </Tag>
                  <Tag v-else color="error">
                    <CloseCircleOutlined /> Failed
                  </Tag>
                </template>

                <template v-else-if="column.key === 'actions'">
                  <Button type="link" size="small" @click="showActivityDetail(record)">
                    <template #icon><EyeOutlined /></template>
                  </Button>
                </template>
              </template>
            </Table>
          </TabPane>

          <!-- Timeline View -->
          <TabPane key="timeline" tab="Timeline View">
            <div v-if="activities.length === 0">
              <AEmpty description="No activities found" />
            </div>
            <Timeline v-else mode="left">
              <TimelineItem
                v-for="activity in activities"
                :key="activity.id"
                :color="getActionConfig(activity.action).color"
              >
                <template #dot>
                  <component
                    :is="getActionConfig(activity.action).icon"
                    style="font-size: 16px;"
                  />
                </template>

                <div class="timeline-item" @click="showActivityDetail(activity)" style="cursor: pointer;">
                  <div class="timeline-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <Space>
                      <Avatar v-if="activity.user" :size="20" :src="activity.user.avatar_url">
                        <template #icon><UserOutlined /></template>
                      </Avatar>
                      <strong>{{ activity.user?.full_name || 'System' }}</strong>
                      <Tag :color="getActionConfig(activity.action).color" size="small">
                        {{ activity.action }}
                      </Tag>
                      <Tag size="small">{{ activity.entity_type }}</Tag>
                    </Space>
                    <Tooltip :title="formatTimestamp(activity.created_at)">
                      <TypographyText type="secondary">
                        {{ formatRelativeTime(activity.created_at) }}
                      </TypographyText>
                    </Tooltip>
                  </div>

                  <div style="margin-top: 4px;">
                    <span v-if="activity.entity_name">"{{ activity.entity_name }}"</span>
                    <span v-else-if="activity.entity_id" style="color: #999;">#{{ activity.entity_id }}</span>
                  </div>

                  <TypographyText v-if="activity.description" type="secondary" style="display: block; margin-top: 4px;">
                    {{ activity.description }}
                  </TypographyText>

                  <Tag v-if="!activity.success" color="error" size="small" style="margin-top: 4px;">
                    Failed
                  </Tag>
                </div>
              </TimelineItem>
            </Timeline>

            <div v-if="activities.length < totalCount" style="text-align: center; margin-top: 16px;">
              <Button @click="pageSize += 20; fetchActivities()">Load More</Button>
            </div>
          </TabPane>
        </Tabs>
      </Spin>
    </Card>

    <!-- Activity Detail Modal -->
    <Modal
      v-model:open="detailModalVisible"
      title="Activity Details"
      :footer="null"
      width="600px"
    >
      <div v-if="selectedActivity">
        <Row :gutter="[16, 16]">
          <Col :span="12">
            <TypographyText type="secondary">Event ID</TypographyText>
            <div><code>{{ selectedActivity.event_id }}</code></div>
          </Col>
          <Col :span="12">
            <TypographyText type="secondary">Timestamp</TypographyText>
            <div>{{ formatTimestamp(selectedActivity.created_at) }}</div>
          </Col>
          <Col :span="12">
            <TypographyText type="secondary">User</TypographyText>
            <div>
              <Space v-if="selectedActivity.user">
                <Avatar :size="20" :src="selectedActivity.user.avatar_url">
                  <template #icon><UserOutlined /></template>
                </Avatar>
                {{ selectedActivity.user.full_name }}
              </Space>
              <span v-else>System</span>
            </div>
          </Col>
          <Col :span="12">
            <TypographyText type="secondary">IP Address</TypographyText>
            <div>{{ selectedActivity.ip_address || '-' }}</div>
          </Col>
          <Col :span="12">
            <TypographyText type="secondary">Action</TypographyText>
            <div>
              <Tag :color="getActionConfig(selectedActivity.action).color">
                {{ selectedActivity.action }}
              </Tag>
            </div>
          </Col>
          <Col :span="12">
            <TypographyText type="secondary">Status</TypographyText>
            <div>
              <Tag v-if="selectedActivity.success" color="success">Success</Tag>
              <Tag v-else color="error">Failed</Tag>
            </div>
          </Col>
          <Col :span="12">
            <TypographyText type="secondary">Entity Type</TypographyText>
            <div><Tag>{{ selectedActivity.entity_type }}</Tag></div>
          </Col>
          <Col :span="12">
            <TypographyText type="secondary">Entity</TypographyText>
            <div>
              {{ selectedActivity.entity_name || `#${selectedActivity.entity_id}` || '-' }}
            </div>
          </Col>
          <Col :span="12">
            <TypographyText type="secondary">Category</TypographyText>
            <div>{{ selectedActivity.category || '-' }}</div>
          </Col>
          <Col :span="12">
            <TypographyText type="secondary">Level</TypographyText>
            <div>{{ selectedActivity.level || '-' }}</div>
          </Col>
          <Col :span="24">
            <TypographyText type="secondary">Description</TypographyText>
            <div>{{ selectedActivity.description || '-' }}</div>
          </Col>
        </Row>
      </div>
    </Modal>
  </Page>
</template>

<style scoped>
.timeline-item {
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 4px;
  transition: background 0.2s;
}

.timeline-item:hover {
  background: #f0f0f0;
}
</style>
</script>
