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
  Select,
  SelectOption,
  DatePicker,
  message,
  Spin,
} from 'ant-design-vue';

import {
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FilterOutlined,
} from '@ant-design/icons-vue';

defineOptions({
  name: 'AuditLogs',
});

const loading = ref(false);
const searchText = ref('');
const actionFilter = ref(null);
const userFilter = ref(null);

const columns = [
  {
    title: 'Timestamp',
    dataIndex: 'timestamp',
    key: 'timestamp',
    width: 180,
  },
  {
    title: 'User',
    dataIndex: 'user',
    key: 'user',
    width: 150,
  },
  {
    title: 'Action',
    dataIndex: 'action',
    key: 'action',
    width: 150,
  },
  {
    title: 'Resource',
    dataIndex: 'resource',
    key: 'resource',
  },
  {
    title: 'Details',
    dataIndex: 'details',
    key: 'details',
  },
  {
    title: 'IP Address',
    dataIndex: 'ipAddress',
    key: 'ipAddress',
    width: 130,
  },
];

const auditLogs = ref([
  {
    id: 1,
    timestamp: '2026-02-13 10:30:45',
    user: 'admin@gawdesy.org',
    action: 'CREATE',
    resource: 'User',
    details: 'Created new user: john@example.com',
    ipAddress: '192.168.1.100',
  },
  {
    id: 2,
    timestamp: '2026-02-13 09:15:22',
    user: 'admin@gawdesy.org',
    action: 'UPDATE',
    resource: 'Settings',
    details: 'Updated general settings',
    ipAddress: '192.168.1.100',
  },
  {
    id: 3,
    timestamp: '2026-02-12 16:45:10',
    user: 'sarah@gawdesy.org',
    action: 'LOGIN',
    resource: 'Authentication',
    details: 'User logged in successfully',
    ipAddress: '192.168.1.105',
  },
  {
    id: 4,
    timestamp: '2026-02-12 14:20:33',
    user: 'admin@gawdesy.org',
    action: 'DELETE',
    resource: 'Document',
    details: 'Deleted document: old-report.pdf',
    ipAddress: '192.168.1.100',
  },
  {
    id: 5,
    timestamp: '2026-02-12 11:05:18',
    user: 'mike@gawdesy.org',
    action: 'UPDATE',
    resource: 'Donation',
    details: 'Updated donation status to completed',
    ipAddress: '192.168.1.110',
  },
  {
    id: 6,
    timestamp: '2026-02-11 15:30:55',
    user: 'admin@gawdesy.org',
    action: 'CREATE',
    resource: 'Campaign',
    details: 'Created new campaign: Spring Fundraiser',
    ipAddress: '192.168.1.100',
  },
  {
    id: 7,
    timestamp: '2026-02-11 10:12:07',
    user: 'emily@gawdesy.org',
    action: 'LOGIN_FAILED',
    resource: 'Authentication',
    details: 'Failed login attempt - invalid password',
    ipAddress: '192.168.1.115',
  },
  {
    id: 8,
    timestamp: '2026-02-10 09:00:00',
    user: 'admin@gawdesy.org',
    action: 'EXPORT',
    resource: 'Data',
    details: 'Exported donor data to CSV',
    ipAddress: '192.168.1.100',
  },
]);

const actionTypes = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGIN_FAILED', 'EXPORT', 'IMPORT'];

const filteredLogs = computed(() => {
  return auditLogs.value.filter((log) => {
    const matchesSearch =
      !searchText.value ||
      log.user.toLowerCase().includes(searchText.value.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchText.value.toLowerCase()) ||
      log.details.toLowerCase().includes(searchText.value.toLowerCase());
    const matchesAction = !actionFilter.value || log.action === actionFilter.value;
    return matchesSearch && matchesAction;
  });
});

function getActionColor(action) {
  const colors = {
    CREATE: 'green',
    UPDATE: 'blue',
    DELETE: 'red',
    LOGIN: 'cyan',
    LOGIN_FAILED: 'orange',
    EXPORT: 'purple',
    IMPORT: 'geekblue',
  };
  return colors[action] || 'default';
}

async function loadLogs() {
  loading.value = true;
  try {
    await new Promise((r) => setTimeout(r, 500));
  } finally {
    loading.value = false;
  }
}

function handleRefresh() {
  loadLogs();
  message.success('Logs refreshed');
}

function handleExport() {
  message.info('Exporting logs to CSV');
}

onMounted(() => {
  loadLogs();
});
</script>

<template>
  <Page title="Audit Logs" description="Track system activities and changes">
    <Spin :spinning="loading">
      <Card>
        <div class="flex justify-between items-center mb-4">
          <Space>
            <Input
              v-model:value="searchText"
              placeholder="Search logs..."
              style="width: 280px"
              allow-clear
            >
              <template #prefix>
                <SearchOutlined />
              </template>
            </Input>
            <Select
              v-model:value="actionFilter"
              placeholder="All Actions"
              style="width: 160px"
              allow-clear
            >
              <SelectOption v-for="action in actionTypes" :key="action" :value="action">
                {{ action }}
              </SelectOption>
            </Select>
            <DatePicker.RangePicker style="width: 260px" />
          </Space>
          <Space>
            <Button @click="handleRefresh">
              <ReloadOutlined />
              Refresh
            </Button>
            <Button type="primary" @click="handleExport">
              <DownloadOutlined />
              Export
            </Button>
          </Space>
        </div>

        <Table
          :data-source="filteredLogs"
          :columns="columns"
          :row-key="(record) => record.id"
          :pagination="{ pageSize: 15 }"
          :scroll="{ x: 1000 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'action'">
              <Tag :color="getActionColor(record.action)">{{ record.action }}</Tag>
            </template>

            <template v-else-if="column.key === 'user'">
              <span class="font-medium">{{ record.user }}</span>
            </template>
          </template>
        </Table>
      </Card>
    </Spin>
  </Page>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}

.font-medium {
  font-weight: 500;
}
</style>
