<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
// import { useUserStore } from '@vben/stores';

import {
  Button,
  Card,
  Col,
  Input,
  message,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  // DeleteOutlined,
  MailOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
  StopOutlined,
  UserAddOutlined,
} from '@ant-design/icons-vue';

import {
  cancelInvitationApi,
  getInvitationsApi,
  getInvitationStatsApi,
  resendInvitationApi,
  type InvitationApi,
} from '#/api/invitation';

defineOptions({
  name: 'InvitationsSettings',
});

const router = useRouter();
// const userStore = useUserStore();

// Current tab
const activeTab = ref('dashboard');

// Stats
const stats = ref<InvitationApi.InvitationStats>({
  total: 0,
  pending: 0,
  accepted: 0,
  expired: 0,
  cancelled: 0,
});
const statsLoading = ref(false);

// Pagination
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total: number) => `Total ${total} invitations`,
});

// State
const loading = ref(false);
const invitations = ref<InvitationApi.Invitation[]>([]);
const recentInvitations = ref<InvitationApi.Invitation[]>([]);
const searchText = ref('');
const statusFilter = ref<string | undefined>(undefined);

// Status options
const statusOptions = [
  { value: undefined, label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Status tag colors
const statusColors: Record<string, string> = {
  pending: 'orange',
  accepted: 'green',
  expired: 'red',
  cancelled: 'default',
  resent: 'blue',
};

// Table columns
const columns = computed(() => [
  { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true },
  { title: 'Status', key: 'status', width: 110 },
  { title: 'Role', key: 'role', width: 130 },
  { title: 'Invited By', key: 'invited_by', width: 150 },
  { title: 'Sent', key: 'created_at', width: 140 },
  { title: 'Expires', key: 'expires_at', width: 140 },
  { title: 'Actions', key: 'actions', width: 120, fixed: 'right' as const },
]);

// Recent columns (simplified)
const recentColumns = [
  { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Sent', key: 'created_at', width: 120 },
  { title: 'Actions', key: 'actions', width: 100 },
];

// Methods
async function fetchStats() {
  statsLoading.value = true;
  try {
    stats.value = await getInvitationStatsApi();
  } catch (error) {
    console.error('Failed to fetch stats:', error);
  } finally {
    statsLoading.value = false;
  }
}

async function fetchInvitations() {
  loading.value = true;
  try {
    const params: InvitationApi.ListInvitationParams = {
      page: pagination.value.current,
      page_size: pagination.value.pageSize,
      search: searchText.value || undefined,
      status: statusFilter.value as InvitationApi.InvitationStatus | undefined,
    };
    const response = await getInvitationsApi(params);
    invitations.value = response.items || [];
    pagination.value.total = response.total || 0;
  } catch (error) {
    console.error('Failed to fetch invitations:', error);
    message.error('Failed to load invitations');
  } finally {
    loading.value = false;
  }
}

async function fetchRecentInvitations() {
  try {
    const response = await getInvitationsApi({ page: 1, page_size: 5 });
    recentInvitations.value = response.items || [];
  } catch (error) {
    console.error('Failed to fetch recent invitations:', error);
  }
}

function onTableChange(pag: any) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchInvitations();
}

function handleSearch() {
  pagination.value.current = 1;
  fetchInvitations();
}

function handleStatusFilter(status: any) {
  statusFilter.value = status;
  pagination.value.current = 1;
  fetchInvitations();
}

function navigateToCreate() {
  router.push({ name: 'InvitationCreate' });
}

async function handleResend(record: InvitationApi.Invitation) {
  try {
    await resendInvitationApi(record.id, { extend_expiry: true });
    message.success('Invitation resent successfully');
    fetchInvitations();
    fetchRecentInvitations();
    fetchStats();
  } catch (error: any) {
    console.error('Failed to resend invitation:', error);
    message.error(error?.response?.data?.detail || 'Failed to resend invitation');
  }
}

async function handleCancel(record: InvitationApi.Invitation) {
  try {
    await cancelInvitationApi(record.id);
    message.success('Invitation cancelled');
    fetchInvitations();
    fetchRecentInvitations();
    fetchStats();
  } catch (error: any) {
    console.error('Failed to cancel invitation:', error);
    message.error(error?.response?.data?.detail || 'Failed to cancel invitation');
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
}

function getExpiryStatus(expiresAt: string): { text: string; color: string } {
  const expires = new Date(expiresAt);
  const now = new Date();
  const diff = expires.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (diff < 0) return { text: 'Expired', color: 'red' };
  if (hours < 24) return { text: `${hours}h left`, color: 'orange' };
  const days = Math.floor(hours / 24);
  return { text: `${days}d left`, color: 'default' };
}

function canResend(record: InvitationApi.Invitation): boolean {
  return ['pending', 'resent'].includes(record.status) && record.resend_count < 5;
}

function canCancel(record: InvitationApi.Invitation): boolean {
  return ['pending', 'resent'].includes(record.status);
}

onMounted(() => {
  fetchStats();
  fetchRecentInvitations();
  fetchInvitations();
});
</script>

<template>
  <Page auto-content-height>
    <div class="invitations-page p-4">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold mb-1">User Invitations</h1>
          <p class="text-gray-500">Invite new users to join your organization</p>
        </div>
        <Button type="primary" @click="navigateToCreate">
          <template #icon><UserAddOutlined /></template>
          Invite User
        </Button>
      </div>

      <!-- Tabs -->
      <Tabs v-model:activeKey="activeTab">
        <!-- Dashboard Tab -->
        <Tabs.TabPane key="dashboard" tab="Dashboard">
          <!-- Stats Cards -->
          <Row :gutter="[16, 16]" class="mb-6">
            <Col :xs="24" :sm="12" :md="6">
              <Card :loading="statsLoading">
                <Statistic
                  title="Total Invitations"
                  :value="stats.total"
                  :value-style="{ color: '#1890ff' }"
                >
                  <template #prefix>
                    <MailOutlined />
                  </template>
                </Statistic>
              </Card>
            </Col>
            <Col :xs="24" :sm="12" :md="6">
              <Card :loading="statsLoading">
                <Statistic
                  title="Pending"
                  :value="stats.pending"
                  :value-style="{ color: '#faad14' }"
                >
                  <template #prefix>
                    <ClockCircleOutlined />
                  </template>
                </Statistic>
              </Card>
            </Col>
            <Col :xs="24" :sm="12" :md="6">
              <Card :loading="statsLoading">
                <Statistic
                  title="Accepted"
                  :value="stats.accepted"
                  :value-style="{ color: '#52c41a' }"
                >
                  <template #prefix>
                    <CheckCircleOutlined />
                  </template>
                </Statistic>
              </Card>
            </Col>
            <Col :xs="24" :sm="12" :md="6">
              <Card :loading="statsLoading">
                <Statistic
                  title="Expired"
                  :value="stats.expired"
                  :value-style="{ color: '#ff4d4f' }"
                >
                  <template #prefix>
                    <CloseCircleOutlined />
                  </template>
                </Statistic>
              </Card>
            </Col>
          </Row>

          <!-- Quick Actions -->
          <Card title="Quick Actions" class="mb-6">
            <div class="flex gap-4 flex-wrap">
              <Button type="primary" @click="navigateToCreate">
                <template #icon><PlusOutlined /></template>
                Send New Invitation
              </Button>
              <Button @click="fetchStats(); fetchRecentInvitations();">
                <template #icon><ReloadOutlined /></template>
                Refresh Stats
              </Button>
            </div>
          </Card>

          <!-- Recent Invitations -->
          <Card title="Recent Invitations">
            <template #extra>
              <a @click="activeTab = 'list'">View All</a>
            </template>
            <Table
              :columns="recentColumns"
              :data-source="recentInvitations"
              :pagination="false"
              :loading="loading"
              row-key="id"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <Tag :color="statusColors[record.status]">
                    {{ record.status }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'created_at'">
                  {{ formatRelativeTime(record.created_at) }}
                </template>
                <template v-else-if="column.key === 'actions'">
                  <Space size="small">
                    <Tooltip v-if="canResend(record as any)" title="Resend">
                      <Button
                        type="link"
                        size="small"
                        @click="handleResend(record as any)"
                      >
                        <template #icon><SendOutlined /></template>
                      </Button>
                    </Tooltip>
                    <Popconfirm
                      v-if="canCancel(record as any)"
                      title="Cancel this invitation?"
                      @confirm="handleCancel(record as any)"
                    >
                      <Tooltip title="Cancel">
                        <Button type="link" size="small" danger>
                          <template #icon><StopOutlined /></template>
                        </Button>
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                </template>
              </template>
            </Table>
          </Card>
        </Tabs.TabPane>

        <!-- All Invitations Tab -->
        <Tabs.TabPane key="list" tab="All Invitations">
          <!-- Filters -->
          <Card class="mb-4">
            <Row :gutter="16" align="middle">
              <Col :xs="24" :md="8">
                <Input
                  v-model:value="searchText"
                  placeholder="Search by email..."
                  allow-clear
                  @press-enter="handleSearch"
                >
                  <template #prefix>
                    <SearchOutlined />
                  </template>
                </Input>
              </Col>
              <Col :xs="24" :md="6">
                <Select
                  v-model:value="statusFilter"
                  placeholder="Filter by status"
                  style="width: 100%"
                  :options="statusOptions"
                  @change="handleStatusFilter"
                />
              </Col>
              <Col :xs="24" :md="4">
                <Button @click="handleSearch">
                  <template #icon><SearchOutlined /></template>
                  Search
                </Button>
              </Col>
              <Col :xs="24" :md="6" class="text-right">
                <Button type="primary" @click="navigateToCreate">
                  <template #icon><UserAddOutlined /></template>
                  Invite User
                </Button>
              </Col>
            </Row>
          </Card>

          <!-- Table -->
          <Card>
            <Table
              :columns="columns"
              :data-source="invitations"
              :pagination="pagination"
              :loading="loading"
              row-key="id"
              @change="onTableChange"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <Tag :color="statusColors[record.status]">
                    {{ record.status }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'role'">
                  {{ record.role?.name || '-' }}
                </template>
                <template v-else-if="column.key === 'invited_by'">
                  {{ record.invited_by?.full_name || record.invited_by?.email || '-' }}
                </template>
                <template v-else-if="column.key === 'created_at'">
                  {{ formatDate(record.created_at) }}
                </template>
                <template v-else-if="column.key === 'expires_at'">
                  <template v-if="record.status === 'pending' || record.status === 'resent'">
                    <Tag :color="getExpiryStatus(record.expires_at).color">
                      {{ getExpiryStatus(record.expires_at).text }}
                    </Tag>
                  </template>
                  <template v-else>
                    {{ formatDate(record.expires_at) }}
                  </template>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <Space size="small">
                    <Tooltip v-if="canResend(record as any)" title="Resend invitation">
                      <Button
                        type="link"
                        size="small"
                        @click="handleResend(record as any)"
                      >
                        <template #icon><SendOutlined /></template>
                      </Button>
                    </Tooltip>
                    <Popconfirm
                      v-if="canCancel(record as any)"
                      title="Cancel this invitation?"
                      ok-text="Yes"
                      cancel-text="No"
                      @confirm="handleCancel(record as any)"
                    >
                      <Tooltip title="Cancel invitation">
                        <Button type="link" size="small" danger>
                          <template #icon><StopOutlined /></template>
                        </Button>
                      </Tooltip>
                    </Popconfirm>
                    <span v-if="!canResend(record as any) && !canCancel(record as any)" class="text-gray-400">
                      -
                    </span>
                  </Space>
                </template>
              </template>
            </Table>
          </Card>
        </Tabs.TabPane>
      </Tabs>
    </div>
  </Page>
</template>

<style scoped>
.invitations-page {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
